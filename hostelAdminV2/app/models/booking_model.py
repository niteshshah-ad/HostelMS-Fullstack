from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


class Booking(BaseModel):
    id: Optional[str] = None
    student_id: str
    student_name: str
    student_email: str
    phone_number: str
    aadhaar_id: str
    gender: Literal["male", "female", "other"]
    hostel_id: Optional[str] = None
    hostel_name: Optional[str] = None
    room_type: Literal["single", "double", "triple"]
    room_number: Optional[int] = None
    current_area: Optional[str] = None
    sleeping_time: Optional[Literal["early", "late"]] = None
    study_habit: Optional[Literal["silent", "balanced", "group"]] = None
    smoking: Optional[Literal["never", "occasionally", "regularly"]] = None
    drinking: Optional[Literal["never", "occasionally", "regularly"]] = None
    cleanliness: Optional[Literal["low", "medium", "high"]] = None
    roommate_match_name: Optional[str] = None
    roommate_match_score: Optional[int] = None
    commute_distance_km: Optional[float] = None
    commute_minutes: Optional[int] = None
    transport_mode: Optional[str] = None
    transport_cost_per_ride: Optional[float] = None
    transport_cost_monthly: Optional[float] = None
    google_maps_url: Optional[str] = None
    predicted_monthly_cost: Optional[float] = None
    booking_amount: Optional[float] = None
    payment_id: Optional[str] = None
    payment_order_id: Optional[str] = None
    payment_signature: Optional[str] = None
    otp_verified: bool = False
    id_proof_image: Optional[str] = None
    status: Optional[
        Literal["pending", "confirmed", "rejected", "cancelled"]
    ] = Field(default="pending")
    cancellation_charge: Optional[float] = 0
    refund_amount: Optional[float] = None
    cancel_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
