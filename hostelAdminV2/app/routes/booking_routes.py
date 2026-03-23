import os
import random
import math
import json
from datetime import datetime, timedelta
from functools import lru_cache
from urllib.parse import quote_plus, urlencode
from urllib.request import Request, urlopen
from uuid import uuid4
from pydantic import BaseModel

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.db.database import db
from app.utils.security import get_current_user, require_roles

router = APIRouter(prefix="/bookings", tags=["Bookings"])


class MatchmakingRequest(BaseModel):
    hostel_id: str | None = None
    hostel_name: str | None = None
    room_type: str
    gender: str
    current_area: str
    sleeping_time: str
    study_habit: str
    smoking: str
    drinking: str
    cleanliness: str


def serialize_booking(booking):
    return {
        "id": str(booking.get("_id")),
        "student_id": booking.get("student_id"),
        "student_name": booking.get("student_name"),
        "student_email": booking.get("student_email"),
        "phone_number": booking.get("phone_number"),
        "aadhaar_id": booking.get("aadhaar_id"),
        "gender": booking.get("gender"),
        "hostel_id": booking.get("hostel_id"),
        "hostel_name": booking.get("hostel_name"),
        "room_type": booking.get("room_type"),
        "room_number": booking.get("room_number"),
        "current_area": booking.get("current_area"),
        "sleeping_time": booking.get("sleeping_time"),
        "study_habit": booking.get("study_habit"),
        "smoking": booking.get("smoking"),
        "drinking": booking.get("drinking"),
        "cleanliness": booking.get("cleanliness"),
        "roommate_match_name": booking.get("roommate_match_name"),
        "roommate_match_score": booking.get("roommate_match_score"),
        "commute_distance_km": booking.get("commute_distance_km"),
        "commute_minutes": booking.get("commute_minutes"),
        "transport_mode": booking.get("transport_mode"),
        "transport_cost_per_ride": booking.get("transport_cost_per_ride"),
        "transport_cost_monthly": booking.get("transport_cost_monthly"),
        "google_maps_url": booking.get("google_maps_url"),
        "predicted_monthly_cost": booking.get("predicted_monthly_cost"),
        "booking_amount": booking.get("booking_amount"),
        "payment_id": booking.get("payment_id"),
        "payment_order_id": booking.get("payment_order_id"),
        "payment_signature": booking.get("payment_signature"),
        "otp_verified": booking.get("otp_verified", False),
        "id_proof_image": booking.get("id_proof_image"),
        "status": booking.get("status"),
        "cancellation_charge": booking.get("cancellation_charge", 0),
        "refund_amount": booking.get("refund_amount"),
        "cancel_reason": booking.get("cancel_reason"),
        "created_at": booking.get("created_at"),
        "cancelled_at": booking.get("cancelled_at"),
    }


def find_hostel(hostel_id=None, hostel_name=None):
    hostel = None
    if hostel_id:
        try:
            hostel = db.hostels.find_one({"_id": ObjectId(hostel_id)})
        except Exception:
            hostel = None
    if not hostel and hostel_name:
        hostel = db.hostels.find_one({"name": hostel_name})
    return hostel


def slugify(value):
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in (value or "")).strip("-")


KNOWN_AREA_POINTS = {
    "lucknow:bkt": (1.5, 6.0),
    "lucknow:aliganj": (3.8, 4.2),
    "lucknow:gomti-nagar": (8.2, 5.0),
    "lucknow:hazratganj": (6.0, 3.2),
    "lucknow:indira-nagar": (7.3, 5.8),
    "jaipur:civil-lines": (4.5, 3.8),
    "jaipur:malviya-nagar": (7.1, 6.2),
    "indore:vijay-nagar": (7.2, 5.6),
    "bhopal:arera-colony": (6.4, 4.6),
    "ahmedabad:navrangpura": (6.5, 4.8),
}


def get_area_point(area, city):
    key = f"{slugify(city)}:{slugify(area)}"
    if key in KNOWN_AREA_POINTS:
        return KNOWN_AREA_POINTS[key]

    seed_source = f"{slugify(city)}-{slugify(area)}"
    seed = sum((index + 1) * ord(char) for index, char in enumerate(seed_source))
    x = round(((seed % 97) / 97) * 10.5 + 1.0, 2)
    y = round((((seed // 97) % 97) / 97) * 10.5 + 1.0, 2)
    return (x, y)


def build_location_query(area, city, force_city=False):
    area_value = (area or "").strip()
    city_value = (city or "").strip()
    area_slug = slugify(area_value)
    city_slug = slugify(city_value)

    has_explicit_region = "," in area_value or "india" in area_slug
    already_mentions_city = city_slug and city_slug in area_slug

    parts = [area_value] if area_value else []
    if city_value and (force_city or (not has_explicit_region and not already_mentions_city)):
        parts.append(city_value)
    if not any("india" in slugify(part) for part in parts):
        parts.append("India")

    return ", ".join([part for part in parts if part])


@lru_cache(maxsize=256)
def geocode_location(query):
    url = "https://nominatim.openstreetmap.org/search?" + urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
            "countrycodes": "in",
        }
    )
    request = Request(
        url,
        headers={
            "User-Agent": "MachanHostel/1.0 (distance lookup)",
            "Accept": "application/json",
        },
    )
    with urlopen(request, timeout=8) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not payload:
        return None

    first_match = payload[0]
    return {
        "lat": float(first_match["lat"]),
        "lon": float(first_match["lon"]),
        "display_name": first_match.get("display_name", query),
    }


def get_route_details(start_point, end_point):
    route_url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{start_point['lon']},{start_point['lat']};{end_point['lon']},{end_point['lat']}?"
        + urlencode({"overview": "false", "alternatives": "false", "steps": "false"})
    )
    request = Request(
        route_url,
        headers={
            "User-Agent": "MachanHostel/1.0 (distance lookup)",
            "Accept": "application/json",
        },
    )
    with urlopen(request, timeout=8) as response:
        payload = json.loads(response.read().decode("utf-8"))

    routes = payload.get("routes") or []
    if not routes:
        return None

    best_route = routes[0]
    return {
        "distance_km": round(best_route.get("distance", 0) / 1000, 1),
        "estimated_minutes": max(1, round(best_route.get("duration", 0) / 60)),
    }


def build_transport_options(distance, estimated_minutes):
    one_way_cost = round(distance * 5, 2)
    monthly_cost = round(one_way_cost * 2 * 26, 2)

    if distance <= 2:
        options = [
            {"mode": "Walk", "per_ride_cost": 0, "monthly_cost": 0, "eta_minutes": min(estimated_minutes, 20)},
            {"mode": "Cycle / E-rickshaw", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": max(8, estimated_minutes)},
        ]
    elif distance <= 6:
        options = [
            {"mode": "E-rickshaw", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": estimated_minutes},
            {"mode": "Bus / Shared Auto", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": estimated_minutes + 6},
        ]
    elif distance <= 12:
        options = [
            {"mode": "Auto", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": estimated_minutes},
            {"mode": "Bus / Auto", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": estimated_minutes + 8},
        ]
    else:
        options = [
            {"mode": "Metro + Auto", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": estimated_minutes},
            {"mode": "Cab Pool", "per_ride_cost": one_way_cost, "monthly_cost": monthly_cost, "eta_minutes": max(estimated_minutes - 10, 18)},
        ]

    best_option = min(options, key=lambda option: option["eta_minutes"])
    return best_option, options


def estimate_commute(current_area, hostel):
    city = hostel.get("city") or "student-city"
    hostel_area = hostel.get("location") or hostel.get("address") or hostel.get("name") or city
    origin_query = build_location_query(current_area, city)
    destination_query = build_location_query(hostel_area, city, force_city=True)
    origin = quote_plus(origin_query)
    destination = quote_plus(destination_query)
    google_maps_url = (
        f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&travelmode=driving"
    )

    try:
        start_geo = geocode_location(origin_query)
        end_geo = geocode_location(destination_query)
        if not start_geo or not end_geo:
            raise ValueError("Missing geocode result")
        route = get_route_details(start_geo, end_geo)
        if not route:
            raise ValueError("Missing route result")
        distance = max(route["distance_km"], 0.5)
        estimated_minutes = route["estimated_minutes"]
    except Exception:
        start = get_area_point(current_area, city)
        end = get_area_point(hostel_area, city)
        distance = round(max(math.dist(start, end) * 2.6, 1.2), 1)
        same_locality = slugify(current_area) == slugify(hostel.get("location"))
        if same_locality:
            distance = 1.2
        estimated_minutes = max(int(distance * 7), 8)

    best_option, options = build_transport_options(distance, estimated_minutes)
    return {
        "from_area": current_area,
        "to_area": hostel_area,
        "city": city,
        "distance_km": distance,
        "estimated_minutes": best_option["eta_minutes"],
        "recommended_transport": best_option["mode"],
        "recommended_transport_cost_per_ride": best_option["per_ride_cost"],
        "recommended_transport_monthly_cost": best_option["monthly_cost"],
        "google_maps_url": google_maps_url,
        "transport_options": options,
    }


def predict_monthly_cost(hostel, room_type, commute):
    base_rent = float(hostel.get("rent") or 0)
    room_multiplier = {
        "single": 1.05,
        "double": 0.91,
        "triple": 0.84,
    }.get(room_type, 1)
    adjusted_rent = round(base_rent * room_multiplier, 2)

    facilities = hostel.get("facilities") or {}
    utilities = 0
    if facilities.get("ac"):
        utilities += 900
    if facilities.get("wifi"):
        utilities += 250
    if facilities.get("cooler"):
        utilities += 300
    if facilities.get("ro"):
        utilities += 100
    if facilities.get("food") or hostel.get("mess"):
        utilities += 1800

    buffer_cost = 500
    predicted_total = round(adjusted_rent + utilities + commute["recommended_transport_monthly_cost"] + buffer_cost, 2)
    return {
        "base_rent": base_rent,
        "room_adjusted_rent": adjusted_rent,
        "utilities_estimate": utilities,
        "transport_estimate": commute["recommended_transport_monthly_cost"],
        "buffer_cost": buffer_cost,
        "predicted_total": predicted_total,
    }


def calculate_match_score(candidate, payload):
    score = 0
    if candidate.get("room_type") == payload.room_type:
        score += 20
    if candidate.get("gender") == payload.gender:
        score += 10

    exact_fields = ["sleeping_time", "study_habit", "smoking", "drinking"]
    for field in exact_fields:
        if candidate.get(field) and candidate.get(field) == getattr(payload, field):
            score += 15

    cleanliness_scale = {"low": 1, "medium": 2, "high": 3}
    candidate_cleanliness = cleanliness_scale.get(candidate.get("cleanliness"))
    target_cleanliness = cleanliness_scale.get(payload.cleanliness)
    if candidate_cleanliness and target_cleanliness:
        difference = abs(candidate_cleanliness - target_cleanliness)
        score += max(18 - difference * 9, 0)

    return min(score, 100)


def build_roommate_match(hostel, payload, current_user_email):
    if payload.room_type == "single":
        return {
            "match_found": False,
            "message": "Single room selected, so a roommate is not required.",
        }

    candidate_bookings = list(
        db.bookings.find(
            {
                "hostel_id": str(hostel.get("_id")),
                "status": "confirmed",
                "student_id": {"$ne": current_user_email},
            }
        )
    )

    best_candidate = None
    best_score = -1
    for candidate in candidate_bookings:
        score = calculate_match_score(candidate, payload)
        if score > best_score:
            best_score = score
            best_candidate = candidate

    if not best_candidate:
        return {
            "match_found": False,
            "message": "No compatible roommate profile found yet for this hostel. We will keep looking as new bookings arrive.",
        }

    return {
        "match_found": True,
        "name": best_candidate.get("student_name"),
        "email": best_candidate.get("student_email"),
        "room_type": best_candidate.get("room_type"),
        "score": best_score,
        "summary": f"{best_candidate.get('student_name')} is the closest current lifestyle match for this stay.",
        "preferences": {
            "sleeping_time": best_candidate.get("sleeping_time") or "--",
            "study_habit": best_candidate.get("study_habit") or "--",
            "smoking": best_candidate.get("smoking") or "--",
            "drinking": best_candidate.get("drinking") or "--",
            "cleanliness": best_candidate.get("cleanliness") or "--",
        },
    }


def find_room(hostel_name, room_type, room_number=None):
    if room_number is not None:
      return db.rooms.find_one({"room_number": room_number, "hostel_name": hostel_name})

    room = db.rooms.find_one(
        {
            "hostel_name": hostel_name,
            "room_type": room_type,
            "$or": [
                {"available_rooms": {"$gt": 0}},
                {"available_rooms": None},
            ],
        }
    )
    if room:
        return room

    return db.rooms.find_one({"hostel_name": hostel_name, "room_type": room_type})


def maybe_update_room_occupancy(room, student_email):
    if not room:
        return False

    if room.get("available_rooms") is not None:
        if room.get("available_rooms", 0) <= 0:
            raise HTTPException(status_code=400, detail="No available rooms for this room type")
        db.rooms.update_one(
            {"_id": room.get("_id")},
            {"$inc": {"occupied": 1, "available_rooms": -1}, "$push": {"occupants": student_email}},
        )
        return True

    capacity = room.get("capacity", 0)
    if capacity and room.get("occupied", 0) >= capacity:
        raise HTTPException(status_code=400, detail="Selected room is full")

    db.rooms.update_one(
        {"_id": room.get("_id")},
        {"$inc": {"occupied": 1}, "$push": {"occupants": student_email}},
    )
    return True


@router.post("/send-otp")
def send_booking_otp(
    phone_number: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.booking_otps.update_one(
        {"student_id": current_user.get("email"), "phone_number": phone_number},
        {
            "$set": {
                "otp_code": otp_code,
                "expires_at": expires_at,
                "verified": False,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )

    return {
        "message": "OTP generated for development use.",
        "dev_otp": otp_code,
        "expires_at": expires_at,
    }


@router.post("/")
def create_booking(
    hostel_id: str = Form(None),
    hostel_name: str = Form(None),
    room_type: str = Form(...),
    room_number: int = Form(None),
    student_name: str = Form(...),
    student_email: str = Form(...),
    phone_number: str = Form(...),
    aadhaar_id: str = Form(...),
    gender: str = Form(...),
    current_area: str = Form(None),
    sleeping_time: str = Form(None),
    study_habit: str = Form(None),
    smoking: str = Form(None),
    drinking: str = Form(None),
    cleanliness: str = Form(None),
    otp_code: str = Form(...),
    booking_amount: float = Form(None),
    payment_id: str = Form(...),
    payment_order_id: str = Form(None),
    payment_signature: str = Form(None),
    id_proof: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
):
    hostel = find_hostel(hostel_id=hostel_id, hostel_name=hostel_name)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    insight_payload = MatchmakingRequest(
        hostel_id=hostel_id,
        hostel_name=hostel_name,
        room_type=room_type,
        gender=gender,
        current_area=current_area or hostel.get("city") or "Student area",
        sleeping_time=sleeping_time or "late",
        study_habit=study_habit or "balanced",
        smoking=smoking or "never",
        drinking=drinking or "never",
        cleanliness=cleanliness or "medium",
    )

    otp_doc = db.booking_otps.find_one(
        {"student_id": current_user.get("email"), "phone_number": phone_number}
    )
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Please request OTP first")
    if otp_doc.get("otp_code") != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if otp_doc.get("expires_at") and otp_doc.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    room = find_room(hostel.get("name"), room_type, room_number)
    occupancy_locked = maybe_update_room_occupancy(room, current_user.get("email"))

    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    id_proof_image = None
    if id_proof:
        ext = os.path.splitext(id_proof.filename)[1]
        filename = f"{uuid4().hex}{ext}"
        file_path = os.path.join(uploads_dir, filename)
        with open(file_path, "wb") as output_file:
            output_file.write(id_proof.file.read())
        id_proof_image = filename

    final_amount = booking_amount if booking_amount is not None else hostel.get("rent") or 0
    commute = estimate_commute(insight_payload.current_area, hostel)
    monthly_cost = predict_monthly_cost(hostel, room_type, commute)
    roommate_match = build_roommate_match(hostel, insight_payload, current_user.get("email"))
    booking_doc = {
        "student_id": current_user.get("email"),
        "student_name": student_name,
        "student_email": current_user.get("email"),
        "phone_number": phone_number,
        "aadhaar_id": aadhaar_id,
        "gender": gender,
        "hostel_id": str(hostel.get("_id")),
        "hostel_name": hostel.get("name"),
        "room_type": room_type,
        "room_number": room.get("room_number") if room else room_number,
        "current_area": insight_payload.current_area,
        "sleeping_time": insight_payload.sleeping_time,
        "study_habit": insight_payload.study_habit,
        "smoking": insight_payload.smoking,
        "drinking": insight_payload.drinking,
        "cleanliness": insight_payload.cleanliness,
        "roommate_match_name": roommate_match.get("name"),
        "roommate_match_score": roommate_match.get("score"),
        "commute_distance_km": commute["distance_km"],
        "commute_minutes": commute["estimated_minutes"],
        "transport_mode": commute["recommended_transport"],
        "transport_cost_per_ride": commute["recommended_transport_cost_per_ride"],
        "transport_cost_monthly": commute["recommended_transport_monthly_cost"],
        "google_maps_url": commute["google_maps_url"],
        "predicted_monthly_cost": monthly_cost["predicted_total"],
        "booking_amount": final_amount,
        "payment_id": payment_id,
        "payment_order_id": payment_order_id,
        "payment_signature": payment_signature,
        "otp_verified": True,
        "id_proof_image": id_proof_image,
        "status": "confirmed",
        "occupancy_locked": occupancy_locked,
        "created_at": datetime.utcnow(),
    }

    result = db.bookings.insert_one(booking_doc)
    db.booking_otps.delete_many(
        {"student_id": current_user.get("email"), "phone_number": phone_number}
    )

    return {
        "message": "Booking created",
        "booking": {
            **serialize_booking({**booking_doc, "_id": result.inserted_id}),
        },
    }


@router.post("/matchmaking")
def get_booking_matchmaking(
    payload: MatchmakingRequest,
    current_user: dict = Depends(get_current_user),
):
    hostel = find_hostel(hostel_id=payload.hostel_id, hostel_name=payload.hostel_name)
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")

    commute = estimate_commute(payload.current_area, hostel)
    monthly_cost = predict_monthly_cost(hostel, payload.room_type, commute)
    roommate_match = build_roommate_match(hostel, payload, current_user.get("email"))

    return {
        "roommate_match": roommate_match,
        "commute": commute,
        "monthly_cost": monthly_cost,
    }


@router.get("/")
def list_bookings(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    bookings = []

    if role == "admin":
        bookings = list(db.bookings.find({}))
        return [serialize_booking(booking) for booking in bookings]

    if role == "warden":
        hostels = list(db.hostels.find({"warden_email": current_user.get("email")}, {"_id": 1}))
        hostel_ids = [str(hostel["_id"]) for hostel in hostels]
        bookings = list(db.bookings.find({"hostel_id": {"$in": hostel_ids}}))
        return [serialize_booking(booking) for booking in bookings]

    bookings = list(db.bookings.find({"student_id": current_user.get("email")}))
    return [serialize_booking(booking) for booking in bookings]


@router.post("/{booking_id}/cancel")
def cancel_booking(
    booking_id: str,
    reason: str = Form("Cancelled by student"),
    current_user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(booking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booking id")

    booking = db.bookings.find_one({"_id": object_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.get("role") == "student" and booking.get("student_id") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Access forbidden")

    if booking.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking_amount = float(booking.get("booking_amount") or 0)
    cancellation_charge = round(booking_amount * 0.1, 2)
    refund_amount = max(booking_amount - cancellation_charge, 0)

    db.bookings.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": "cancelled",
                "cancel_reason": reason,
                "cancellation_charge": cancellation_charge,
                "refund_amount": refund_amount,
                "cancelled_at": datetime.utcnow(),
            }
        },
    )

    if booking.get("occupancy_locked"):
        room = find_room(booking.get("hostel_name"), booking.get("room_type"), booking.get("room_number"))
        if room:
            if room.get("available_rooms") is not None:
                db.rooms.update_one(
                    {"_id": room.get("_id")},
                    {
                        "$inc": {"occupied": -1, "available_rooms": 1},
                        "$pull": {"occupants": booking.get("student_id")},
                    },
                )
            else:
                db.rooms.update_one(
                    {"_id": room.get("_id")},
                    {
                        "$inc": {"occupied": -1},
                        "$pull": {"occupants": booking.get("student_id")},
                    },
                )

    updated_booking = db.bookings.find_one({"_id": object_id})
    return {
        "message": "Booking cancelled",
        "booking": serialize_booking(updated_booking),
    }


@router.delete("/{booking_id}")
def delete_booking(booking_id: str, current_user: dict = Depends(require_roles("admin", "warden"))):
    try:
        object_id = ObjectId(booking_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booking id")

    booking = db.bookings.find_one({"_id": object_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.get("role") == "warden":
        hostels = list(db.hostels.find({"warden_email": current_user.get("email")}, {"_id": 1}))
        hostel_ids = [str(hostel["_id"]) for hostel in hostels]
        if booking.get("hostel_id") not in hostel_ids:
            raise HTTPException(status_code=403, detail="Access forbidden")

    db.bookings.delete_one({"_id": object_id})
    return {"message": "Booking deleted"}
