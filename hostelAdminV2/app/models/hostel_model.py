from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class Facilities(BaseModel):
    ac: Optional[bool] = False
    cooler: Optional[bool] = False
    wifi: Optional[bool] = False
    ro: Optional[bool] = False
    food: Optional[bool] = False


class Hostel(BaseModel):
    id: Optional[str] = None
    owner_id: Optional[str] = None
    name: str
    location: Optional[str] = None
    address: str
    city: Optional[str] = None
    total_rooms: int = Field(..., ge=0)
    available_rooms: Optional[int] = Field(None, ge=0)
    # allow rent as single value or a range
    rent: Optional[float] = None
    rent_min: Optional[float] = None
    rent_max: Optional[float] = None
    mess: Optional[bool] = False
    facilities: Optional[Facilities] = None
    images: Optional[List[str]] = None
    warden_email: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
