from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
import json
import os
from uuid import uuid4
from datetime import datetime
from app.models.hostel_model import Hostel
from app.db.database import db
from app.utils.security import require_role, get_current_user
from app.utils.filtering import build_hostel_query, build_room_query

router = APIRouter(prefix="/hostels")


def save_uploaded_files(files):
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    saved_files = []

    if files:
        for f in files:
            ext = os.path.splitext(f.filename)[1]
            fname = f"{uuid4().hex}{ext}"
            path = os.path.join(uploads_dir, fname)
            with open(path, "wb") as out:
                out.write(f.file.read())
            saved_files.append(fname)

    return saved_files


def parse_json_param(raw_value, fallback):
    if not raw_value:
        return fallback

    try:
        parsed = json.loads(raw_value)
    except (TypeError, ValueError):
        return fallback

    return parsed if parsed is not None else fallback


@router.post("/bulk")
def add_multiple_hostels(
    hostels: List[Hostel],
    current_user: dict = Depends(require_role("admin"))
):
    hostel_list = [hostel.dict() for hostel in hostels]
    db.hostels.insert_many(hostel_list)

    return {"message": f"{len(hostel_list)} Hostels added successfully"}


@router.post("/")
def add_hostel(
    name: str,
    address: str,
    total_rooms: int,
    available_rooms: Optional[int] = None,
    rent: Optional[float] = None,
    rent_min: Optional[float] = None,
    rent_max: Optional[float] = None,
    location: Optional[str] = None,
    city: Optional[str] = None,
    mess: Optional[bool] = False,
    files: Optional[List[UploadFile]] = File(None),
    current_user: dict = Depends(get_current_user),
    ac: Optional[bool] = False,
    cooler: Optional[bool] = False,
    wifi: Optional[bool] = False,
    ro: Optional[bool] = False,
    food: Optional[bool] = False,
    facilities_json: Optional[str] = None,
    manual_facilities_json: Optional[str] = None,
):
    # require authentication
    saved_files = save_uploaded_files(files)

    facilities = parse_json_param(
        facilities_json,
        {"ac": ac, "cooler": cooler, "wifi": wifi, "ro": ro, "food": food},
    )
    manual_facilities = parse_json_param(manual_facilities_json, [])

    hostel_doc = {
        "name": name,
        "address": address,
        "location": location,
        "city": city,
        "total_rooms": total_rooms,
        "available_rooms": total_rooms if available_rooms is None else available_rooms,
        "rent": rent,
        "rent_min": rent_min,
        "rent_max": rent_max,
        "mess": mess,
        "facilities": facilities,
        "manual_facilities": manual_facilities,
        "images": saved_files,
        "created_by": current_user.get("email"),
        "owner_id": current_user.get("email"),
        "warden_email": current_user.get("email"),
        "status": "pending",
        "approved_by": None,
        "approved_at": None,
        "created_at": datetime.utcnow()
    }

    insert_result = db.hostels.insert_one(hostel_doc)
    response_hostel = {
        **hostel_doc,
        "id": str(insert_result.inserted_id),
    }
    response_hostel.pop("_id", None)
    response_hostel.pop("created_by", None)

    return {"message": "Hostel added successfully", "hostel": response_hostel}


@router.put("/{hostel_name}")
def update_hostel(
    hostel_name: str,
    name: str,
    address: str,
    total_rooms: int,
    available_rooms: Optional[int] = None,
    rent: Optional[float] = None,
    rent_min: Optional[float] = None,
    rent_max: Optional[float] = None,
    location: Optional[str] = None,
    city: Optional[str] = None,
    mess: Optional[bool] = False,
    files: Optional[List[UploadFile]] = File(None),
    current_user: dict = Depends(get_current_user),
    ac: Optional[bool] = False,
    cooler: Optional[bool] = False,
    wifi: Optional[bool] = False,
    ro: Optional[bool] = False,
    food: Optional[bool] = False,
    facilities_json: Optional[str] = None,
    manual_facilities_json: Optional[str] = None,
):
    hostel = db.hostels.find_one({"name": hostel_name})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.get("role") == "warden" and hostel.get("warden_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Access forbidden")

    replacement_images = hostel.get("images", []) or []
    if files:
        uploads_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
        for image_name in replacement_images:
            image_path = os.path.join(uploads_dir, image_name)
            if os.path.exists(image_path):
                os.remove(image_path)
        replacement_images = save_uploaded_files(files)

    facilities = parse_json_param(
        facilities_json,
        {"ac": ac, "cooler": cooler, "wifi": wifi, "ro": ro, "food": food},
    )
    manual_facilities = parse_json_param(manual_facilities_json, hostel.get("manual_facilities", []))

    updated_doc = {
        "name": name,
        "address": address,
        "location": location,
        "city": city,
        "total_rooms": total_rooms,
        "available_rooms": total_rooms if available_rooms is None else available_rooms,
        "rent": rent,
        "rent_min": rent_min,
        "rent_max": rent_max,
        "mess": mess,
        "facilities": facilities,
        "manual_facilities": manual_facilities,
        "images": replacement_images,
        "updated_at": datetime.utcnow(),
    }

    db.hostels.update_one({"_id": hostel["_id"]}, {"$set": updated_doc})

    if name != hostel_name:
        db.rooms.update_many({"hostel_name": hostel_name}, {"$set": {"hostel_name": name}})
        db.bookings.update_many({"hostel_name": hostel_name}, {"$set": {"hostel_name": name}})

    refreshed_hostel = db.hostels.find_one({"_id": hostel["_id"]}, {"_id": 0})
    return {"message": "Hostel updated successfully", "hostel": refreshed_hostel}


@router.get("/")
def list_hostels(
    name: Optional[str] = Query(None, description="Hostel name search"),
    city: Optional[str] = Query(None, description="City or part of address"),
    rent_min: Optional[float] = Query(None),
    rent_max: Optional[float] = Query(None),
    wifi: Optional[bool] = Query(None),
    ac: Optional[bool] = Query(None),
    ro: Optional[bool] = Query(None),
    cooler: Optional[bool] = Query(None),
    mess: Optional[bool] = Query(None),
    room_type: Optional[str] = Query(None, description="room type string"),
    seater: Optional[int] = Query(None, description="number of occupants per room (1,2,3)"),
    window: Optional[bool] = Query(None, description="whether room has window - looks for 'window' in amenities"),
    min_rooms_available: Optional[int] = Query(None),
    max_rooms_available: Optional[int] = Query(None),
):
    # Build hostel-level query using helper
    q = build_hostel_query(
        name=name,
        city=city,
        rent_min=rent_min,
        rent_max=rent_max,
        wifi=wifi,
        ac=ac,
        ro=ro,
        cooler=cooler,
        mess=mess,
    )

    hostels = list(db.hostels.find(q, {"_id": 0}))

    # If no room-specific filters, optionally compute available rooms count and return
    results = []
    for h in hostels:
        stored_available_rooms = h.get("available_rooms")
        # compute rooms available matching optional room filters
        room_q = build_room_query(h.get("name"), room_type=room_type, seater=seater, window=window)
        rooms_cursor = db.rooms.find(room_q, {"_id": 0, "capacity": 1, "occupied": 1, "available_rooms": 1, "total_rooms": 1})
        rooms = list(rooms_cursor)
        available_count = stored_available_rooms if stored_available_rooms is not None else 0
        if rooms:
            available_count = 0
            for r in rooms:
                if r.get("available_rooms") is not None:
                    available_count += max(0, int(r.get("available_rooms", 0)))
                    continue

                total_capacity = r.get("total_rooms", r.get("capacity", 0))
                occupied = r.get("occupied", 0)
                remaining = max(0, int(total_capacity) - int(occupied))
                if remaining > 0:
                    available_count += remaining

        # if min/max rooms available filters applied, enforce them
        if min_rooms_available is not None and available_count < min_rooms_available:
            continue
        if max_rooms_available is not None and available_count > max_rooms_available:
            continue

        h_copy = h.copy()
        h_copy["available_rooms"] = available_count
        results.append(h_copy)

    return results


@router.delete("/{hostel_name}")
def delete_hostel(hostel_name: str, current_user: dict = Depends(get_current_user)):
    hostel = db.hostels.find_one({"name": hostel_name})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.get("role") == "warden" and hostel.get("warden_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Access forbidden")

    image_names = hostel.get("images", []) or []
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
    for image_name in image_names:
        image_path = os.path.join(uploads_dir, image_name)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.rooms.delete_many({"hostel_name": hostel_name})
    res = db.hostels.delete_one({"name": hostel_name})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hostel not found")

    return {"message": "Hostel deleted"}


@router.post("/{hostel_name}/facilities")
def add_or_update_facility(
    hostel_name: str,
    facility: str,
    value: bool,
    current_user: dict = Depends(get_current_user)
):
    # only admin or hostel's warden can modify facilities
    hostel = db.hostels.find_one({"name": hostel_name})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.get("role") == "warden" and hostel.get("warden_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Access forbidden")

    db.hostels.update_one({"name": hostel_name}, {"$set": {f"facilities.{facility}": value}})
    return {"message": "Facility updated"}


@router.delete("/{hostel_name}/facilities")
def delete_facility(hostel_name: str, facility: str, current_user: dict = Depends(get_current_user)):
    hostel = db.hostels.find_one({"name": hostel_name})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    if current_user.get("role") == "warden" and hostel.get("warden_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Access forbidden")

    db.hostels.update_one({"name": hostel_name}, {"$unset": {f"facilities.{facility}": ""}})
    return {"message": "Facility removed"}
