from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import ALLOWED_ORIGINS, UPLOAD_DIR
from database.database import init_db

app = FastAPI(
    title="Inspectra 2.0 API",
    description="AI-powered Industrial Defect Inspection System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database initialisation — runs once at startup
# Creates tables if they don't exist; safe to call on every restart.
# ---------------------------------------------------------------------------
init_db()

# ---------------------------------------------------------------------------
# Static file serving — GET /uploads/{filename}
# Serves original inspection images and AI-generated heatmaps.
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from routes.inspection import router as inspection_router
from routes.history    import router as history_router
from routes.analytics  import router as analytics_router

app.include_router(inspection_router, prefix="/api")
app.include_router(history_router,    prefix="/api")
app.include_router(analytics_router,  prefix="/api")


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["Core"])
def root():
    return {
        "message": "Welcome to Inspectra 2.0",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/health", tags=["Core"])
def health_check():
    from services.ai_service import get_ai_status
    return {
        "status": "healthy",
        "service": "Inspectra Backend",
        "version": "2.0.0",
        "ai_engine": get_ai_status(),
    }
