from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.utils.jwt import create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from app.services.auth_service import register_user, login_user, update_user_profile
from app.models.user_model import User
from app.utils.security import get_current_user, require_role
from app.utils.security import hash_password
from app.db.database import db


router = APIRouter()

class LoginSchema(BaseModel):
    email: str
    password: str


class ProfileUpdateSchema(BaseModel):
    name: str
    email: EmailStr
    current_password: str = ""
    new_password: str = ""
    photo: str | None = None

@router.post("/login")
def login(data: LoginSchema):
    try:
        user = login_user(data.email, data.password)
    except ValueError as error:
        raise HTTPException(status_code=403, detail=str(error))

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return user   


@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "photo": current_user.get("photo", "")
    }


@router.put("/profile")
def update_profile(
    payload: ProfileUpdateSchema,
    current_user: dict = Depends(get_current_user)
):
    try:
        return update_user_profile(current_user, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/register")
def register(user: User):
    try:
        res = register_user(user)
    except ValueError as error:
        raise HTTPException(status_code=403, detail=str(error))

    if not res:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    return res


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        res = login_user(form_data.username, form_data.password)
    except ValueError as error:
        raise HTTPException(status_code=403, detail=str(error))

    if not res:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return res

@router.post("/create-warden")
def create_warden(
    user: User,
    current_user: dict = Depends(require_role("admin"))
):
    user_dict = user.dict()
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["role"] = "warden"
    user_dict["created_at"] = __import__('datetime').datetime.utcnow()

    db.users.insert_one(user_dict)

    return {"message": "Warden created successfully"}


#routes for admin,only admin can access this route
@router.get("/admin-dashboard")
def admin_dashboard(current_user: dict = Depends(require_role("admin"))):
    return {
        "message": "Welcome Admin",
        "user": current_user["email"]
    }
