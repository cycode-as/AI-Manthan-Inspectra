"""
routes/history.py
-----------------
GET /api/history
GET /api/history/{inspection_id}

Returns inspection records from SQLite.
Responses match the frontend contract field names exactly.
"""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Inspection

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Error helper — matches the error contract
# ---------------------------------------------------------------------------
def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "success": False,
            "error": {"code": code, "message": message},
        },
    )


# ---------------------------------------------------------------------------
# GET /api/history
# ---------------------------------------------------------------------------
@router.get("/history", tags=["History"])
def get_history(
    db:    Session = Depends(get_db),
    limit: int     = 50,
    skip:  int     = 0,
):
    """
    Returns all inspection records, newest first.

    Query parameters
    ----------------
    limit : int  — Max records to return (default 50, max 200).
    skip  : int  — Records to skip for pagination (default 0).
    """
    # Clamp limit to prevent accidental full-table dumps
    limit = min(max(1, limit), 200)
    skip  = max(0, skip)

    try:
        rows = (
            db.query(Inspection)
            .order_by(Inspection.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return JSONResponse(
            status_code=200,
            content={
                "total":       db.query(Inspection).count(),
                "limit":       limit,
                "skip":        skip,
                "inspections": [row.to_dict() for row in rows],
            },
        )

    except Exception as exc:
        logger.exception("Failed to fetch inspection history: %s", exc)
        return _error(
            code    = "DATABASE_ERROR",
            message = "Could not retrieve inspection history.",
            status  = 500,
        )


# ---------------------------------------------------------------------------
# GET /api/history/{inspection_id}
# ---------------------------------------------------------------------------
@router.get("/history/{inspection_id}", tags=["History"])
def get_inspection_by_id(
    inspection_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns a single inspection record by its ID.
    Returns 404 if not found.
    """
    try:
        row = db.query(Inspection).filter(Inspection.id == inspection_id).first()

        if row is None:
            return _error(
                code    = "INSPECTION_NOT_FOUND",
                message = f"No inspection found with ID {inspection_id}.",
                status  = 404,
            )

        return JSONResponse(status_code=200, content=row.to_dict())

    except Exception as exc:
        logger.exception("Failed to fetch inspection %s: %s", inspection_id, exc)
        return _error(
            code    = "DATABASE_ERROR",
            message = "Could not retrieve the inspection record.",
            status  = 500,
        )
