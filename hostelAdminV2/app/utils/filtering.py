from typing import Optional, Dict, Any


def build_hostel_query(
    name: Optional[str] = None,
    city: Optional[str] = None,
    rent_min: Optional[float] = None,
    rent_max: Optional[float] = None,
    wifi: Optional[bool] = None,
    ac: Optional[bool] = None,
    ro: Optional[bool] = None,
    cooler: Optional[bool] = None,
    mess: Optional[bool] = None,
) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if name:
        q["name"] = {"$regex": name, "$options": "i"}
    if city:
        q["address"] = {"$regex": city, "$options": "i"}
    if rent_min is not None or rent_max is not None:
        rent_q: Dict[str, Any] = {}
        if rent_min is not None:
            rent_q["$gte"] = rent_min
        if rent_max is not None:
            rent_q["$lte"] = rent_max
        q["rent"] = rent_q
    if wifi is not None:
        q["facilities.wifi"] = wifi
    if ac is not None:
        q["facilities.ac"] = ac
    if ro is not None:
        q["facilities.ro"] = ro
    if cooler is not None:
        q["facilities.cooler"] = cooler
    if mess is not None:
        q["mess"] = mess

    return q


def build_room_query(
    hostel_name: str,
    room_type: Optional[str] = None,
    seater: Optional[int] = None,
    window: Optional[bool] = None,
) -> Dict[str, Any]:
    room_q: Dict[str, Any] = {"hostel_name": hostel_name}
    if room_type:
        room_q["room_type"] = room_type
    if seater is not None:
        room_q["capacity"] = seater
    if window is not None:
        if window:
            room_q["amenities"] = {"$in": ["window"]}
        else:
            room_q["amenities"] = {"$nin": ["window"]}

    return room_q
