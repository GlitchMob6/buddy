# Buddy Phase 3 — MVP Build Plan

This document outlines the detailed architecture, database design, and granular implementation steps required to build the Buddy Phase 3 MVP. The user's goal is to go from a blank slate to a fully functioning application using Tauri v2, Svelte, Python, SQLite, and Supabase.

## User Review Required

> [!IMPORTANT]
> **Tauri Sidecar vs Local Server:** Tauri supports calling external binaries (sidecars). To achieve a "single binary" distribution with a Python backend, the Python code must be compiled into a standalone executable (e.g., using PyInstaller) and bundled as a Tauri sidecar. We will run the Python sidecar as a local HTTP server (using FastAPI or Flask) which the Tauri frontend will ping, or alternatively communicate via stdin/stdout. *Decision:* We will proceed with **FastAPI as a PyInstaller sidecar** for robust frontend/backend communication. Please confirm this approach.

> [!WARNING]
> **Hyprland Support:** Tauri's window management on Wayland/Hyprland works but full "workspace" control (moving apps to specific workspaces, setting strict fullscreen, managing multiple monitors) might require invoking raw `hyprctl` commands from the Python or Rust backend rather than relying solely on Tauri APIs.

## 1. Recommended Folder & Project Structure

To maintain a clean separation of concerns while targeting a single Tauri binary, we'll use a monorepo-style structure where Tauri is the host, Svelte is the frontend, and Python is the backend sidecar.

```text
/home/bwoy/buddy/
├── src/                      # Frontend (Svelte/Vite)
│   ├── lib/
│   │   ├── components/       # Reusable UI (Cards, Inputs, etc.)
│   │   ├── stores/           # Svelte stores for state (Tasks, User, Navigation)
│   │   └── api/              # API wrapper communicating with Python sidecar
│   ├── routes/               # The 8 Pages routing logic
│   ├── app.css               # Global theme (Accent, locked colors, styling)
│   └── App.svelte            # Main entrypoint
├── src-tauri/                # Tauri backend (Rust config & sidecar definitions)
│   ├── tauri.conf.json       # App config, permissions, sidecar binding
│   └── src/main.rs           # Rust entrypoint (spawns Python sidecar)
├── backend/                  # Python backend (compiled to sidecar)
│   ├── main.py               # FastAPI entrypoint
│   ├── engine/               # Session engine & distraction controls
│   ├── sync/                 # Supabase sync worker
│   ├── database/
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schema.py         # Pydantic schemas for API
│   │   └── db_setup.py       # SQLite connection and migration logic
│   └── requirements.txt
├── build-scripts/            # Scripts to run PyInstaller and copy to src-tauri
└── package.json
```

## 2. Phase 3 MVP Build Order & Dependencies

### Step 1: Foundation Setup
- Initialize Tauri project with Svelte + Vite.
- Setup Python virtual environment & required packages (`fastapi`, `uvicorn`, `sqlalchemy`, `supabase`, `pydantic`).
- Create build scripts to compile `backend/` via PyInstaller into a standalone executable suitable for Tauri sidecar embedding.
  
### Step 2: Database Layer & Models (SQLite)
- Implement SQLAlchemy engines and all 6 models.
- Create automated migration script to initialize the SQLite file in Tauri's AppData directory upon first launch.

### Step 3: Python Backend Architecture
- Build FastAPI routes for frontend consumption (CRUD for tasks, sessions).
- Implement the **Session Engine**: AI estimation placeholder logic, session state transitions, focus score calculation, and penalty logic handling.

### Step 4: Supabase Sync Worker
- Implement Background Thread / ASGI Lifespan event in Python to wake up every 5 minutes.
- Fetch un-synced tasks from Supabase, insert to SQLite, update Supabase `synced = true`.

### Step 5: Svelte UI Implementation
- Implement global CSS leveraging locked visual tokens (Minimal brutalism, Space Grotesk, JetBrains Mono, near-black backgrounds).
- Implement The 8 Pages with routing.
- Integrate frontend with local Python API.

### Step 6: Distraction Controls & Hyprland Integration
- Implement restricted browsing wrapper component for MVP.
- Setup Python scripts to interface with local system hooks or `hyprctl` for workspace enforcement.

---

## 3. SQLAlchemy Models (Python backend)

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Task(Base):
    __tablename__ = 'tasks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String) # exam/assignment/project
    priority = Column(String) # low/med/high
    due_date = Column(DateTime, nullable=True)
    estimated_mins = Column(Integer) # AI estimated
    status = Column(String, default="pending") # pending/done/carried
    penalty_level = Column(Integer, default=0) # 0-3
    workspace_id = Column(Integer, ForeignKey('workspaces.id'), nullable=True)
    source = Column(String, default="manual") # manual/android
    supabase_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session_tasks = relationship("SessionTask", back_populates="task")
    penalties = relationship("Penalty", back_populates="task")
    workspace = relationship("Workspace", back_populates="tasks")


class Session(Base):
    __tablename__ = 'sessions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    status = Column(String, default="active") # active/complete/abandoned
    planned_mins = Column(Integer, default=0)
    actual_mins = Column(Integer, default=0)
    focus_score = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    tasks_planned = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)

    session_tasks = relationship("SessionTask", back_populates="session")


class SessionTask(Base):
    __tablename__ = 'session_tasks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey('sessions.id'), nullable=False)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    order_index = Column(Integer, default=0)
    allocated_mins = Column(Integer, default=0)
    actual_mins = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    penalty_applied = Column(Boolean, default=False)

    session = relationship("Session", back_populates="session_tasks")
    task = relationship("Task", back_populates="session_tasks")


class Penalty(Base):
    __tablename__ = 'penalties'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    session_id = Column(Integer, ForeignKey('sessions.id'), nullable=True)
    penalty_type = Column(String, nullable=False) # delay/lock/visible
    severity = Column(Integer, default=1) # 1-3
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="penalties")


class Workspace(Base):
    __tablename__ = 'workspaces'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
    active_app = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="workspace")


class Setting(Base):
    __tablename__ = 'settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=False) # JSON-serialised
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 4. Supabase Schema SQL

The Supabase table is write-only from Android and polled by the Python backend.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pending_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_input TEXT NOT NULL,
    title VARCHAR(255),
    task_type VARCHAR(50),
    priority VARCHAR(20),
    due_date TIMESTAMPTZ,
    synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to optimize querying unsynced tasks
CREATE INDEX idx_pending_tasks_unsynced ON pending_tasks(user_id) WHERE synced = FALSE;
```

*Note: You mentioned an Edge Function parsing natural language. That edge function would trigger on row insertion or via a specific REST route to update the structured fields (`title`, `task_type`, etc.) from `raw_input` before it gets synced to Buddy.*

---

## 5. Sync Worker Design

The Sync Worker will be a dedicated asynchronous task loop within the Python backend (managed by FastAPI's `lifespan` or `asyncio.create_task`).

**Sync Flow:**
1. **Trigger:** Fires on Buddy startup, and subsequently every 5 minutes while Buddy is active. No long-polling required since real-time task entry is rarely time-critical to the exact second.
2. **Fetch:** Requests `GET /rest/v1/pending_tasks?synced=eq.false` from Supabase (using `supabase-py`).
3. **Parse Data:** Maps Supabase JSON response to SQLAlchemy `Task` objects.
4. **Insert into SQLite:** Opens a SQLite transaction (thread-safe, utilizing SQLAlchemy async/sync sessions), and `INSERT`s new tasks. It assigns local `id` tracking, filling `supabase_id` with the UUID.
5. **Mark as Synced:** Upon successful SQLite commit, Python makes a `PATCH` request to Supabase acknowledging the processed UUIDs (`UPDATE pending_tasks SET synced = TRUE, synced_at = NOW() WHERE id IN (...)`).
6. **Error Handling:** If SQLite fails, it does not PATCH Supabase. If PATCH fails, tasks might duplicate, so we use `supabase_id` as a `UNIQUE` constraint locally to ignore duplicate ingestion seamlessly.
7. **Notify UI:** Python emits a WebSocket push or SSE (Server-Sent Event) to the Svelte frontend to immediately update the Tasks UI without requiring a manual refresh.

---

## 6. Technical Risks to Address

- **PyInstaller Sidecar Cold Start & Size:** Bundling a Python HTTP server with an entire ML stack/SQLAlchemy using PyInstaller can produce a 50MB-100MB binary payload. Cold start time might be 1-2 seconds on older systems, meaning the Tauri frontend must display a cohesive Splash Screen or "Connecting to Session Engine" state.
- **SQLite Concurrency & Multi-Threading:** If the sync worker runs on a background thread and the Web UI modifies a task simultaneously, SQLite may return a `database is locked` error. We MUST use SQLAlchemy's connection pooling with `check_same_thread=False` and correctly define timeout semantics, or rely on FastAPI's synchronous endpoint design relying on Python's async scheduler context to queue queries.
- **Hyprland Native Actions vs Tauri APIs:** "Hyprland-style named workspaces". Are these virtual workspaces simulated natively inside a single massive full-screen Tauri UI or actual real OS Wayland workspaces created on the fly? Given it says "Platform MVP: Arch Linux + Hyprland", if we are simulating this inside the app, it's trivial. If we invoke actual Hyprland Workspaces via IPC/bash calls to `hyprctl workspace`, we need to strictly handle losing focus or users bypassing the system via native keybinds.

## Open Questions
- Do you want to start by scaffolding the Tauri+Svelte layer first, or the Python FastAPI sidecar layer first?
- Should the Python sidecar use FastAPI (local HTTP REST + websocket) for UI communication, or Tauri's native IPC piped through `stdin/stdout`? (FastAPI is usually much easier to debug independently via Swagger UI).
