from app.db.database import db
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    password_needs_rehash,
)
from datetime import datetime
import re


NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z\s.'-]{1,}$")
STRONG_PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$")


def register_user(user_data):
    user_dict = user_data.dict()
    # prevent duplicate registration
    if db.users.find_one({"email": user_dict.get("email")}):
        return None

    name = (user_dict.get("name") or "").strip()
    if not NAME_PATTERN.match(name):
        raise ValueError("Enter a valid name using letters only")

    password = user_dict.get("password") or ""
    if not STRONG_PASSWORD_PATTERN.match(password):
        raise ValueError("Password must include uppercase, lowercase, number, symbol, and be at least 8 characters")

    requested_role = user_dict.get("role", "student")
    if requested_role == "admin":
        raise ValueError("Admin accounts cannot be created from public signup")

    user_dict["name"] = name
    user_dict["password"] = hash_password(password)
    # public registration only allows student/warden roles
    user_dict["role"] = requested_role if requested_role in {"student", "warden"} else "student"
    user_dict["created_at"] = datetime.utcnow()

    db.users.insert_one(user_dict)

    token = create_access_token({"sub": user_dict["email"]})
    return {"access_token": token, "token_type": "bearer"}



def login_user(email: str, password: str):
    user = db.users.find_one({"email": email})
    if not user:
        return None

    if user.get("banned"):
        raise ValueError("This account has been banned by admin")

    if not verify_password(password, user["password"]):
        return None

    if password_needs_rehash(user["password"]):
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hash_password(password), "updated_at": datetime.utcnow()}},
        )

    token = create_access_token({"sub": user["email"]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],   
        "email": user["email"]  
    }


def update_user_profile(current_user: dict, update_data):
    user_dict = update_data.dict()
    current_email = current_user.get("email", "")
    next_name = (user_dict.get("name") or current_user.get("name") or "").strip()
    next_email = (user_dict.get("email") or current_email or "").strip().lower()
    current_password = user_dict.get("current_password") or ""
    new_password = user_dict.get("new_password") or ""
    next_photo = user_dict.get("photo")

    if not NAME_PATTERN.match(next_name):
        raise ValueError("Enter a valid name using letters only")

    if not next_email:
        raise ValueError("Email is required")

    email_changed = next_email != current_email
    password_changed = bool(new_password)

    if email_changed or password_changed:
        if not current_password:
            raise ValueError("Current password is required to change email or password")

        if not verify_password(current_password, current_user["password"]):
            raise ValueError("Current password is incorrect")

    if email_changed and db.users.find_one({"email": next_email}):
        raise ValueError("User with this email already exists")

    updates = {
        "name": next_name,
        "email": next_email,
        "photo": next_photo or "",
        "updated_at": datetime.utcnow(),
    }

    if password_changed:
        if not STRONG_PASSWORD_PATTERN.match(new_password):
            raise ValueError("Password must include uppercase, lowercase, number, symbol, and be at least 8 characters")

        updates["password"] = hash_password(new_password)

    db.users.update_one({"email": current_email}, {"$set": updates})

    token = create_access_token({"sub": next_email})
    return {
        "message": "Profile updated successfully",
        "access_token": token,
        "token_type": "bearer",
        "role": current_user.get("role"),
        "profile": {
            "name": next_name,
            "email": next_email,
            "role": current_user.get("role"),
            "photo": updates["photo"],
        },
    }
