from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship, backref

Base = declarative_base()

class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    node_type = Column(String, nullable=False, default='task')  # 'group' or 'task'
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String, nullable=True)
    priority = Column(String, default='med')  # low/med/high
    due_date = Column(DateTime, nullable=True)
    estimated_mins = Column(Integer, default=60)
    status = Column(String, default='pending')  # pending/done/carried
    penalty_level = Column(Integer, default=0)  # 0-3
    workspace_id = Column(Integer, ForeignKey('workspaces.id'), nullable=True)
    source = Column(String, default='manual')  # manual/android
    supabase_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    children = relationship('Task', backref=backref('parent', remote_side=[id]), lazy='dynamic')
    penalties = relationship('Penalty', back_populates='task')
    session_tasks = relationship('SessionTask', back_populates='task')
    workspace = relationship('Workspace', back_populates='tasks')


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
