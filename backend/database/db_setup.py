import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base

# DB Path Logic
# Using a local SQLite file. Ideally, this should live in the OS AppData
# directory for production packaging, but for Phase 3 dev MVP we use the current dir.
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "..", "buddy.sqlite3")

# SQLite URL
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Connection pool settings for SQLite concurrency (sync thread safety handling)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create tables if they don't exist yet."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Generator to yield database sessions to FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
