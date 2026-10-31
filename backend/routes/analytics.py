"""
routes/analytics.py
-------------------
GET /api/analytics

Returns dashboard statistics calculated from live SQLite data.
Response shape matches the frontend contract exactly.
"""

import logging
from collections import defaultdict

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Inspection

logger = logging.getLogger(__name__)

router = APIRouter()

# Number of recent inspections to include in the response
RECENT_LIMIT = 5


# ---------------------------------------------------------------------------
# Error helper
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
# GET /api/analytics
# ---------------------------------------------------------------------------
@router.get("/analytics", tags=["Analytics"])
def get_analytics(db: Session = Depends(get_db)):
    """
    Returns inspection statistics for the dashboard.

    All numbers are calculated from live database records.

    Response
    --------
    total_inspections   : int   — Total records in the DB.
    passed              : int   — Count of PASS decisions.
    rejected            : int   — Count of REJECT decisions.
    needs_review        : int   — Count of NEEDS REVIEW decisions.
    defect_distribution : dict  — Count of ANOMALY predictions per category.
    recent_inspections  : list  — Last 5 inspections (newest first).
    """
    try:
        all_rows = db.query(Inspection).all()

        total        = len(all_rows)
        passed       = sum(1 for r in all_rows if r.decision == "PASS")
        rejected     = sum(1 for r in all_rows if r.decision == "REJECT")
        needs_review = sum(1 for r in all_rows if r.decision == "NEEDS REVIEW")

        # defect_distribution counts records where prediction == "ANOMALY",
        # grouped by category. This reflects where the AI detected anomalies
        # regardless of the final decision (REJECT or NEEDS REVIEW).
        defect_dist: dict[str, int] = defaultdict(int)
        for row in all_rows:
            if row.prediction == "ANOMALY":
                defect_dist[row.category] += 1

        # Recent inspections — newest first, capped at RECENT_LIMIT
        recent_rows = (
            db.query(Inspection)
            .order_by(Inspection.created_at.desc())
            .limit(RECENT_LIMIT)
            .all()
        )

        return JSONResponse(
            status_code=200,
            content={
                "total_inspections":   total,
                "passed":              passed,
                "rejected":            rejected,
                "needs_review":        needs_review,
                "defect_distribution": dict(defect_dist),
                "recent_inspections":  [r.to_dict() for r in recent_rows],
            },
        )

    except Exception as exc:
        logger.exception("Failed to calculate analytics: %s", exc)
        return _error(
            code    = "DATABASE_ERROR",
            message = "Could not retrieve analytics data.",
            status  = 500,
        )
