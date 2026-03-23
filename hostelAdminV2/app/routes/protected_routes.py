from fastapi import APIRouter, Depends
from app.utils.security import get_current_user

router = APIRouter()

@router.get("/dashboard")
def dashboard(current_user: dict = Depends(get_current_user)):
    return {
        "message": f"Welcome {current_user['email']}",
        "role": current_user["role"]
    }
