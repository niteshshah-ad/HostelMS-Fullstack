from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId
from app.models.room_model import Room
from app.db.database import db
from app.utils.security import require_roles

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.post("/")
def create_room(room: Room, current_user: dict = Depends(require_roles("admin", "warden"))):
    # validate room_type
    allowed_room_types = {"single", "double", "triple"}
    if room.room_type is not None and room.room_type not in allowed_room_types:
        raise HTTPException(status_code=400, detail="Invalid room_type. Must be one of: single, double, triple")

    # allow room groups (aggregated) or individual rooms
    hostel_name = room.hostel_name
    existing = None
    if room.room_number is not None:
        existing = db.rooms.find_one({"room_number": room.room_number, "hostel_name": hostel_name})
    elif room.room_type:
        existing = db.rooms.find_one({"room_type": room.room_type, "hostel_name": hostel_name})

    if existing:
        raise HTTPException(status_code=400, detail="Room entry already exists")

    room_doc = room.dict()
    # set created_at
    room_doc["created_at"] = datetime.utcnow()
    # default total_rooms/available_rooms for single physical room
    if room_doc.get("total_rooms") is None:
        room_doc["total_rooms"] = 1
    if room_doc.get("available_rooms") is None:
        # compute from total_rooms and occupied
        room_doc["available_rooms"] = max(0, room_doc.get("total_rooms", 1) - room_doc.get("occupied", 0))

    room_doc["created_by"] = current_user.get("email")
    res = db.rooms.insert_one(room_doc)
    return {"message": "Room created successfully", "id": str(res.inserted_id)}


@router.get("/")
def get_rooms(current_user: dict = Depends(require_roles("admin", "warden"))):
    rooms = list(db.rooms.find({}, {}))
    out = []
    for r in rooms:
        r_copy = {k: v for k, v in r.items() if k != "_id"}
        r_copy["id"] = str(r.get("_id"))
        out.append(r_copy)
    return out


@router.put("/{room_number}")
def update_room(room_number: int, room: Room, current_user: dict = Depends(require_roles("admin", "warden"))):
    update_doc = room.dict(exclude_unset=True)
    allowed_room_types = {"single", "double", "triple"}
    if "room_type" in update_doc and update_doc.get("room_type") not in allowed_room_types:
        raise HTTPException(status_code=400, detail="Invalid room_type. Must be one of: single, double, triple")
    # if total_rooms changed, ensure available_rooms stays consistent
    if "total_rooms" in update_doc and "available_rooms" not in update_doc:
        existing = db.rooms.find_one({"room_number": room_number})
        if existing:
            occupied = existing.get("occupied", 0)
            update_doc["available_rooms"] = max(0, update_doc["total_rooms"] - occupied)

    res = db.rooms.update_one({"room_number": room_number}, {"$set": update_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room updated"}


@router.delete("/{room_number}")
def delete_room(room_number: int, current_user: dict = Depends(require_roles("admin", "warden"))):
    res = db.rooms.delete_one({"room_number": room_number})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room deleted"}


@router.post("/{room_number}/assign")
def assign_occupant(room_number: int, occupant_email: str, current_user: dict = Depends(require_roles("admin", "warden"))):
    room = db.rooms.find_one({"room_number": room_number})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    # If aggregated/grouped room entries exist, use available_rooms
    if room.get("total_rooms") is not None and room.get("total_rooms") > 1:
        if room.get("available_rooms", 0) <= 0:
            raise HTTPException(status_code=400, detail="No available rooms")
        db.rooms.update_one({"room_number": room_number}, {"$inc": {"occupied": 1, "available_rooms": -1}, "$push": {"occupants": occupant_email}})
    else:
        # single room usage: compare capacity
        if room.get("occupied", 0) >= room.get("capacity", 0):
            raise HTTPException(status_code=400, detail="Room full")
        db.rooms.update_one({"room_number": room_number}, {"$inc": {"occupied": 1}})
        db.rooms.update_one({"room_number": room_number}, {"$push": {"occupants": occupant_email}})

    return {"message": "Occupant assigned"}


@router.post("/{room_number}/unassign")
def unassign_occupant(room_number: int, occupant_email: str, current_user: dict = Depends(require_roles("admin", "warden"))):
    room = db.rooms.find_one({"room_number": room_number})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("occupied", 0) <= 0:
        raise HTTPException(status_code=400, detail="No occupants to remove")
    # adjust available_rooms accordingly
    if room.get("total_rooms") is not None and room.get("total_rooms") > 1:
        db.rooms.update_one({"room_number": room_number}, {"$inc": {"occupied": -1, "available_rooms": 1}, "$pull": {"occupants": occupant_email}})
    else:
        db.rooms.update_one({"room_number": room_number}, {"$inc": {"occupied": -1}, "$pull": {"occupants": occupant_email}})
    return {"message": "Occupant unassigned"}
