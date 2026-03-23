from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId
from app.db.database import db
from app.utils.security import require_role, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/hostels/{hostel_name}/approve")
def approve_hostel(hostel_name: str, current_user: dict = Depends(require_role("admin"))):
    hostel = db.hostels.find_one({"name": hostel_name})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    db.hostels.update_one({"name": hostel_name}, {"$set": {"status": "approved", "approved_by": current_user.get("email"), "approved_at": datetime.utcnow()}})
    return {"message": "Hostel approved"}


@router.post("/hostels/{hostel_name}/deny")
def deny_hostel(hostel_name: str, reason: str = None, current_user: dict = Depends(require_role("admin"))):
    hostel = db.hostels.find_one({"name": hostel_name})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    db.hostels.update_one({"name": hostel_name}, {"$set": {"status": "denied", "denied_reason": reason, "approved_by": current_user.get("email"), "approved_at": datetime.utcnow()}})
    return {"message": "Hostel denied"}


@router.post("/users/ban")
def ban_user(email: str, current_user: dict = Depends(require_role("admin"))):
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.users.update_one({"email": email}, {"$set": {"banned": True, "banned_by": current_user.get("email"), "banned_at": datetime.utcnow()}})
    return {"message": "User banned"}


@router.post("/users/unban")
def unban_user(email: str, current_user: dict = Depends(require_role("admin"))):
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.users.update_one({"email": email}, {"$unset": {"banned": "", "banned_by": "", "banned_at": ""}})
    return {"message": "User unbanned"}


@router.get("/users")
def list_users(current_user: dict = Depends(require_role("admin"))):
    users = list(db.users.find({}, {"password": 0, "_id": 0}))
    return users


@router.get("/bookings")
def list_all_bookings(current_user: dict = Depends(require_role("admin"))):
    bookings = list(db.bookings.find({}, {"_id": 1, "room_number": 1, "hostel_name": 1, "user_email": 1, "user_name": 1, "booked_at": 1}))
    # convert _id to str
    for b in bookings:
        b["id"] = str(b.pop("_id"))
    return bookings


@router.get("/revenue")
def revenue_summary(current_user: dict = Depends(require_role("admin"))):
    # aggregate bookings joined with rooms to sum rent per hostel and total
    pipeline = [
        {"$lookup": {
            "from": "rooms",
            "let": {"rnum": "$room_number", "hname": "$hostel_name"},
            "pipeline": [
                {"$match": {"$expr": {"$and": [{"$eq": ["$room_number", "$$rnum"]}, {"$eq": ["$hostel_name", "$$hname"]}]}}},
                {"$project": {"rent": 1, "hostel_name": 1}}
            ],
            "as": "room_info"
        }},
        {"$unwind": {"path": "$room_info", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$room_info.hostel_name", "revenue": {"$sum": {"$ifNull": ["$room_info.rent", 0]}}, "count": {"$sum": 1}}},
        {"$project": {"hostel": "$_id", "revenue": 1, "count": 1, "_id": 0}}
    ]

    per_hostel = list(db.bookings.aggregate(pipeline))
    total = sum(h.get("revenue", 0) for h in per_hostel)
    return {"total_revenue": total, "by_hostel": per_hostel}
