import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database.db_setup import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Buddy Session Engine",
    description="Python backend sidecar for Buddy Phase 3 MVP",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4716", "tauri://localhost", "http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "buddy-backend"}

@app.get("/stats/today")
def stats_today():
    return {
        "focus_score": 74,
        "time_today": "4h 20m",
        "streak": 6,
        "penalties": 1,
        "focus_score_yesterday": 66,
        "focus_score_week_avg": 81,
        "focus_score_best": 91
    }

@app.get("/sessions/active")
def active_session():
    return None

@app.get("/calendar/week")
def calendar_week():
    return [
        {"date": "Mon", "day": 1, "has_session": True, "is_deadline": False},
        {"date": "Tue", "day": 2, "has_session": True, "is_deadline": False},
        {"date": "Wed", "day": 3, "has_session": False, "is_deadline": False},
        {"date": "Thu", "day": 4, "has_session": True, "is_deadline": True},
        {"date": "Fri", "day": 5, "has_session": False, "is_deadline": False},
        {"date": "Sat", "day": 6, "has_session": True, "is_deadline": False},
        {"date": "Sun", "day": 7, "has_session": False, "is_deadline": False}
    ]

@app.get("/stats/weekly")
def stats_weekly():
    return [
        {"day": "M", "tasks_completed": 5},
        {"day": "T", "tasks_completed": 8},
        {"day": "W", "tasks_completed": 3},
        {"day": "T", "tasks_completed": 9},
        {"day": "F", "tasks_completed": 6},
        {"day": "S", "tasks_completed": 11},
        {"day": "S", "tasks_completed": 0}
    ]