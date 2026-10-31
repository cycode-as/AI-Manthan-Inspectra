"""
database/database.py
--------------------
SQLAlchemy engine, session factory, and Base for all ORM models.

We use SQLAlchemy 2.x with the 1.x-compatible Session API so the rest of
the codebase can use simple synchronous sessions (no async complexity needed
for SQLite at hackathon scale).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Import the DB URL from the central config (one source of truth).
import sys
from pathlib import Path

# Ensure the backend/ directory is on sys.path so `config` is importable
# whether this module is run directly or via uvicorn.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import DATABASE_URL

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
# connect_args={"check_same_thread": False} is required for SQLite when
# multiple threads share the same connection (FastAPI runs in threads).
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,          # Set to True temporarily to see raw SQL in logs
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
# autocommit=False  → we control when transactions are committed.
# autoflush=False   → we flush explicitly; avoids surprise queries mid-request.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ---------------------------------------------------------------------------
# Declarative base — all ORM models inherit from this
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Dependency — used in FastAPI route handlers via Depends()
# ---------------------------------------------------------------------------
def get_db():
    """
    Yields a database session and guarantees it is closed after the request,
    even if an exception is raised.

    Usage in a route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Table initialisation — called once at application startup
# ---------------------------------------------------------------------------
def init_db():
    """
    Creates all tables defined in ORM models if they do not already exist.
    Safe to call on every startup (CREATE TABLE IF NOT EXISTS semantics).
    Import models before calling this so Base.metadata knows about them.
    """
    # Import here to register models with Base.metadata before create_all.
    from database import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
