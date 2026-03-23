from datetime import datetime, timedelta
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.database import db
from app.utils.security import get_current_user, require_roles

router = APIRouter(prefix="/wellness", tags=["Wellness"])


class WellnessCheckinRequest(BaseModel):
    consent: bool = Field(default=False)
    mood: str
    sleep_hours: float = Field(..., ge=0, le=24)
    meals_taken: int = Field(..., ge=0, le=3)
    stress_level: int = Field(..., ge=1, le=5)
    water_intake_liters: float = Field(..., ge=0, le=10)
    meditation_minutes: int = Field(default=0, ge=0, le=180)
    lights_off_when_leave: bool = False
    short_shower: bool = False
    used_reusable_bottle: bool = False
    avoided_food_waste: bool = False


MOOD_SCORE = {
    "great": 100,
    "good": 85,
    "okay": 68,
    "low": 48,
    "overwhelmed": 30,
}


def build_wellness_score(payload: WellnessCheckinRequest):
    score = MOOD_SCORE.get(payload.mood, 60)

    if payload.sleep_hours < 5:
        score -= 20
    elif payload.sleep_hours < 6:
        score -= 14
    elif payload.sleep_hours < 7:
        score -= 8
    elif payload.sleep_hours > 9:
        score -= 4
    else:
        score += 6

    if payload.meals_taken == 0:
        score -= 22
    elif payload.meals_taken == 1:
        score -= 14
    elif payload.meals_taken == 2:
        score -= 6
    else:
        score += 4

    score -= (payload.stress_level - 1) * 7

    if payload.water_intake_liters >= 2:
        score += 6
    elif payload.water_intake_liters < 1:
        score -= 6

    if payload.meditation_minutes >= 10:
        score += 5

    return max(0, min(int(round(score)), 100))


def build_eco_score(payload: WellnessCheckinRequest):
    score = 25
    if payload.lights_off_when_leave:
        score += 20
    if payload.short_shower:
        score += 18
    if payload.used_reusable_bottle:
        score += 18
    if payload.avoided_food_waste:
        score += 19
    if payload.meals_taken == 3:
        score += 5

    return max(0, min(score, 100))


def build_tips(payload: WellnessCheckinRequest, wellness_score: int, eco_score: int):
    tips = []

    if payload.sleep_hours < 6:
        tips.append("Your sleep looks low. Try a lighter routine and aim for 7+ hours tonight.")
    if payload.meals_taken < 2:
        tips.append("Irregular meals can affect energy. Try not to skip breakfast or dinner tomorrow.")
    if payload.stress_level >= 4:
        tips.append("Stress is running high. A short walk, breathing break, or counselor check-in could help.")
    if payload.water_intake_liters < 1.5:
        tips.append("Hydration looks low today. Keep a bottle nearby and take small sips through the day.")
    if eco_score < 55:
        tips.append("Your eco score has room to grow. Start with one habit like lights off or food waste reduction.")
    if wellness_score >= 80:
        tips.append("Nice balance today. Keep this rhythm going and protect your sleep schedule.")

    return tips[:4]


def build_badges(payload: WellnessCheckinRequest, wellness_score: int, eco_score: int):
    badges = []

    if wellness_score >= 85:
        badges.append("Calm Mind")
    if eco_score >= 80:
        badges.append("Green Room")
    if payload.meditation_minutes >= 15:
        badges.append("Mindful Minute")
    if payload.meals_taken == 3 and payload.water_intake_liters >= 2:
        badges.append("Healthy Rhythm")
    if payload.lights_off_when_leave and payload.short_shower and payload.avoided_food_waste:
        badges.append("Low Waste Hero")

    return badges


def serialize_checkin(record):
    return {
        "id": str(record.get("_id")),
        "student_email": record.get("student_email"),
        "student_name": record.get("student_name"),
        "mood": record.get("mood"),
        "sleep_hours": record.get("sleep_hours"),
        "meals_taken": record.get("meals_taken"),
        "stress_level": record.get("stress_level"),
        "water_intake_liters": record.get("water_intake_liters"),
        "meditation_minutes": record.get("meditation_minutes"),
        "lights_off_when_leave": record.get("lights_off_when_leave"),
        "short_shower": record.get("short_shower"),
        "used_reusable_bottle": record.get("used_reusable_bottle"),
        "avoided_food_waste": record.get("avoided_food_waste"),
        "wellness_score": record.get("wellness_score"),
        "eco_score": record.get("eco_score"),
        "tips": record.get("tips", []),
        "badges": record.get("badges", []),
        "created_at": record.get("created_at"),
    }


def build_student_summary(student_email: str):
    recent_checkins = list(
        db.wellness_checkins.find({"student_email": student_email}).sort("created_at", -1).limit(7)
    )

    if not recent_checkins:
        return {
            "latest": None,
            "recent": [],
            "average_wellness_score": None,
            "average_eco_score": None,
            "streak_days": 0,
        }

    latest = recent_checkins[0]
    wellness_scores = [entry.get("wellness_score", 0) for entry in recent_checkins]
    eco_scores = [entry.get("eco_score", 0) for entry in recent_checkins]

    streak_days = 0
    expected_day = datetime.utcnow().date()
    for entry in recent_checkins:
      entry_date = entry.get("created_at")
      if not entry_date:
          break
      checkin_day = entry_date.date()
      if checkin_day == expected_day or checkin_day == expected_day - timedelta(days=1 if streak_days == 0 else 0):
          streak_days += 1
          expected_day = checkin_day - timedelta(days=1)
      else:
          break

    return {
        "latest": serialize_checkin(latest),
        "recent": [serialize_checkin(entry) for entry in recent_checkins],
        "average_wellness_score": round(mean(wellness_scores), 1),
        "average_eco_score": round(mean(eco_scores), 1),
        "streak_days": streak_days,
    }


@router.post("/checkin")
def create_checkin(
    payload: WellnessCheckinRequest,
    current_user: dict = Depends(require_roles("student")),
):
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Wellness tracking is opt-in only.")

    wellness_score = build_wellness_score(payload)
    eco_score = build_eco_score(payload)
    tips = build_tips(payload, wellness_score, eco_score)
    badges = build_badges(payload, wellness_score, eco_score)

    record = {
        "student_email": current_user.get("email"),
        "student_name": current_user.get("name"),
        "student_id": str(current_user.get("_id")),
        "consent": payload.consent,
        "mood": payload.mood,
        "sleep_hours": payload.sleep_hours,
        "meals_taken": payload.meals_taken,
        "stress_level": payload.stress_level,
        "water_intake_liters": payload.water_intake_liters,
        "meditation_minutes": payload.meditation_minutes,
        "lights_off_when_leave": payload.lights_off_when_leave,
        "short_shower": payload.short_shower,
        "used_reusable_bottle": payload.used_reusable_bottle,
        "avoided_food_waste": payload.avoided_food_waste,
        "wellness_score": wellness_score,
        "eco_score": eco_score,
        "tips": tips,
        "badges": badges,
        "created_at": datetime.utcnow(),
    }

    inserted = db.wellness_checkins.insert_one(record)
    record["_id"] = inserted.inserted_id

    db.users.update_one(
        {"email": current_user.get("email")},
        {
            "$set": {
                "wellness_opt_in": True,
                "last_wellness_score": wellness_score,
                "last_eco_score": eco_score,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    return {
        "message": "Daily wellness check-in saved successfully.",
        "checkin": serialize_checkin(record),
        "summary": build_student_summary(current_user.get("email")),
    }


@router.get("/me")
def get_my_wellness(current_user: dict = Depends(require_roles("student"))):
    return build_student_summary(current_user.get("email"))


@router.get("/summary")
def get_wellness_summary(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")

    if role not in {"warden", "admin"}:
        raise HTTPException(status_code=403, detail="Access forbidden")

    email_filter = None
    if role == "warden":
        managed_hostels = list(
            db.hostels.find(
                {
                    "$or": [
                        {"warden_email": current_user.get("email")},
                        {"owner_id": current_user.get("email")},
                        {"created_by": current_user.get("email")},
                    ]
                },
                {"name": 1},
            )
        )
        hostel_names = [item.get("name") for item in managed_hostels if item.get("name")]
        email_filter = db.bookings.distinct("student_email", {"hostel_name": {"$in": hostel_names}})

    query = {}
    if email_filter is not None:
        query["student_email"] = {"$in": email_filter} if email_filter else {"$in": []}

    recent = list(db.wellness_checkins.find(query).sort("created_at", -1).limit(50))
    if not recent:
        return {
            "students_tracked": 0,
            "average_wellness_score": None,
            "average_eco_score": None,
            "high_support_need": 0,
            "green_champions": 0,
            "latest_tips": [],
        }

    wellness_scores = [entry.get("wellness_score", 0) for entry in recent]
    eco_scores = [entry.get("eco_score", 0) for entry in recent]
    latest_tips = []
    for entry in recent:
        latest_tips.extend(entry.get("tips", []))

    return {
        "students_tracked": len(set(entry.get("student_email") for entry in recent if entry.get("student_email"))),
        "average_wellness_score": round(mean(wellness_scores), 1),
        "average_eco_score": round(mean(eco_scores), 1),
        "high_support_need": sum(1 for entry in recent if entry.get("wellness_score", 100) < 50),
        "green_champions": sum(1 for entry in recent if entry.get("eco_score", 0) >= 80),
        "latest_tips": latest_tips[:5],
    }
