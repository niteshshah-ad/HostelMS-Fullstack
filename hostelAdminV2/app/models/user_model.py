from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class User(BaseModel):
    id: Optional[str] = None
    name: str
    email: EmailStr
    password: str
    role: Optional[Literal['student', 'warden', 'hostel_owner', 'admin']] = Field(default='student')
    phone: Optional[str] = None
    photo: Optional[str] = None
    created_at: Optional[datetime] = None
    

