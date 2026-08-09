"""
Database connection and session management.

Uses SQLite by default for local development. Set DATABASE_URL in the
environment to point at PostgreSQL in production, e.g.:

    postgresql://user:password@host:5432/sensor_calibration
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sensor_calibration.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Import models before calling this so metadata is populated."""
    from models import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
