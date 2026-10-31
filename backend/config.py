from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR   = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite:///./inspectra.db"

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# ---------------------------------------------------------------------------
# Image upload constraints
# ---------------------------------------------------------------------------
MAX_UPLOAD_BYTES      = 10 * 1024 * 1024          # 10 MB hard limit
ALLOWED_EXTENSIONS    = {".jpg", ".jpeg", ".png"}  # checked against filename
ALLOWED_CONTENT_TYPES = {                           # checked against MIME type
    "image/jpeg",
    "image/png",
}

# ---------------------------------------------------------------------------
# Supported product categories
# Extend this list when new AI models are added.
# ---------------------------------------------------------------------------
SUPPORTED_CATEGORIES = {"metal"}
