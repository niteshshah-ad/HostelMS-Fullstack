import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routes.auth_routes import router as auth_router
from app.routes import protected_routes
from app.routes.room_routes import router as room_router
from app.routes.hostel_routes import router as hostel_router
from app.routes.booking_routes import router as booking_router
from app.routes.admin_routes import router as admin_router
from app.routes.payment_routes import router as payment_router
from app.routes.wellness_routes import router as wellness_router


app = FastAPI()
static_dir = os.path.join(os.path.dirname(__file__), "static")
frontend_origins_env = os.getenv("FRONTEND_ORIGINS", "")
allowed_origins = [origin.strip() for origin in frontend_origins_env.split(",") if origin.strip()]

if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(protected_routes.router, prefix="/protected", tags=["Protected"])
app.include_router(auth_router, prefix="/auth")

@app.get("/")
def root():
    return {"message": "HostelAdmin API Running"}

app.include_router(room_router)
app.include_router(hostel_router)
app.include_router(booking_router)
app.include_router(admin_router)
app.include_router(payment_router, prefix="/payments", tags=["Payments"])
app.include_router(wellness_router)
