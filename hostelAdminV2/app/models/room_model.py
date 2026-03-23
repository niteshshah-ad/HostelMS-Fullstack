from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class Room(BaseModel):
    id: Optional[str] = None
    hostel_id: Optional[str] = None
    room_number: Optional[int] = None
    # capacity can represent seater for single/double/triple, kept for compatibility
    capacity: Optional[int] = Field(None, ge=0)
    # for aggregated room groups
    room_type: Optional[Literal['single', 'double', 'triple']] = None
    total_rooms: Optional[int] = Field(None, ge=0)
    available_rooms: Optional[int] = Field(None, ge=0)
    occupied: int = 0
    amenities: Optional[List[str]] = None
    rent: Optional[float] = None
    images: Optional[List[str]] = None
    hostel_name: Optional[str] = None
    occupants: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    