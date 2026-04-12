import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
from database.db_setup import init_db, get_db
from database.models import Task
from sqlalchemy.orm import Session
from datetime import datetime


class TaskCreate(BaseModel):
    parent_id: Optional[int] = None
    node_type: str = "task"
    title: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: str = "med"
    due_date: Optional[str] = None
    estimated_mins: int = 60
    penalty_level: int = 0

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

@app.get("/tasks")
def get_tasks(parent_id: str = None, db: Session = Depends(get_db)):
    # Convert string "null" or None to actual None for query
    pid = None if (parent_id is None or parent_id == "null") else int(parent_id)
    query = db.query(Task).filter(Task.parent_id == pid)
    tasks = query.order_by(Task.created_at.desc()).all()
    result = []
    for t in tasks:
        child_count = db.query(Task).filter(Task.parent_id == t.id).count()
        done_count = db.query(Task).filter(
            Task.parent_id == t.id,
            Task.status == 'done'
        ).count()
        result.append({
            "id": t.id,
            "parent_id": t.parent_id,
            "node_type": t.node_type,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "estimated_mins": t.estimated_mins,
            "status": t.status,
            "penalty_level": t.penalty_level,
            "order_index": getattr(t, 'order_index', 0) or 0,
            "child_count": child_count,
            "done_count": done_count,
            "progress": round((done_count / child_count) * 100) if child_count > 0 else 0,
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
    return result

@app.post("/tasks")
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    new_task = Task(
        parent_id=task.parent_id,
        node_type=task.node_type,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        priority=task.priority,
        due_date=datetime.fromisoformat(task.due_date) if task.due_date else None,
        estimated_mins=task.estimated_mins,
        penalty_level=task.penalty_level,
        source="manual"
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return {"id": new_task.id, "title": new_task.title, "node_type": new_task.node_type}

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, updates: dict, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    for key, value in updates.items():
        setattr(task, key, value)
    db.commit()
    return {"ok": True}

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    db.delete(task)
    db.commit()
    return {"ok": True}