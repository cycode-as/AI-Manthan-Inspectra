"""
tests/conftest.py
-----------------
Shared pytest fixtures for the Inspectra 2.0 backend test suite.

Key design decisions
--------------------
1. Every test gets a FRESH in-memory SQLite database.
   Tests never share state and never touch inspectra.db on disk.

2. The FastAPI app is imported fresh with the test DB injected via
   FastAPI's dependency_overrides mechanism.

3. Image helpers create real valid images using Pillow so Pillow's
   own validation logic inside image_service.py is exercised.
"""

import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Ensure backend/ is on sys.path so all backend modules are importable
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import models BEFORE Base so metadata is fully populated when app loads
from database import models  # noqa: F401
from database.database import Base, get_db
from main import app


# ---------------------------------------------------------------------------
# In-memory SQLite engine — created fresh for every test function
#
# WHY StaticPool?
# sqlite:///:memory: creates a NEW database for each connection by default.
# StaticPool forces all connections to reuse the SAME underlying connection,
# so create_all() and the test session both see the same in-memory database.
# ---------------------------------------------------------------------------

@pytest.fixture()
def db_session():
    """
    Yields a SQLAlchemy session backed by a fresh in-memory SQLite database.
    Tables are created before the test and dropped after.
    Every test is fully isolated — no shared state, no disk writes.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,           # one shared connection = one DB
    )

    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(
        bind=engine, autocommit=False, autoflush=False
    )
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """
    FastAPI TestClient with the real DB dependency replaced by the
    in-memory test session.  Every test gets an isolated, clean database.
    Cleans up any files written to uploads/ after the test completes.
    """
    # Collect files in uploads/ before the test runs
    from config import UPLOAD_DIR
    files_before = set(UPLOAD_DIR.iterdir())

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # session lifecycle managed by db_session fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()

    # Remove any files created during this test
    for f in UPLOAD_DIR.iterdir():
        if f not in files_before and f.name != ".gitkeep":
            try:
                f.unlink()
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Image byte helpers — used across multiple test modules
# ---------------------------------------------------------------------------

def make_jpeg_bytes(width: int = 224, height: int = 224) -> bytes:
    """Returns bytes of a valid JPEG image."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(180, 100, 50)).save(buf, "JPEG")
    return buf.getvalue()


def make_png_bytes(width: int = 224, height: int = 224) -> bytes:
    """Returns bytes of a valid PNG image."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=(50, 150, 200)).save(buf, "PNG")
    return buf.getvalue()


def make_corrupt_bytes() -> bytes:
    """Returns bytes that look like a JPEG header but are corrupt."""
    return bytes([0xFF, 0xD8, 0xFF, 0x00, 0xDE, 0xAD, 0xBE, 0xEF] * 8)


def make_oversized_bytes() -> bytes:
    """Returns 11 MB of data with a fake JPEG header — exceeds the 10 MB limit."""
    return b"\xff\xd8" + b"\x00" * (11 * 1024 * 1024)


def make_gif_bytes() -> bytes:
    """Returns bytes of a valid GIF — unsupported format."""
    buf = io.BytesIO()
    Image.new("RGB", (50, 50), color=(0, 255, 0)).save(buf, "GIF")
    return buf.getvalue()
