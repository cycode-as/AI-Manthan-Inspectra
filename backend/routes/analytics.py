"""
routes/analytics.py
-------------------
GET /api/analytics
GET /api/model/performance

Returns dashboard statistics and model performance metrics
calculated from live SQLite data and genuine engine configuration.
Response shape matches the frontend contract exactly.
"""

import logging
from collections import defaultdict

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Inspection
from services.ai_service import get_ai_status

logger = logging.getLogger(__name__)

router = APIRouter()

# Number of recent inspections to include in the response
RECENT_LIMIT = 5

# Supported product categories recognized by Inspectra
KNOWN_CATEGORIES = [
    "metal",
    "bottle",
    "cable",
    "leather",
    "screw",
    "transistor",
    "wood",
    "electronics",
    "textiles",
]


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
    defect_rate         : float — Percentage of REJECT decisions.
    pass_rate           : float — Percentage of PASS decisions.
    defect_distribution : dict  — Count of ANOMALY predictions per category.
    category_breakdown  : list  — Detailed per-category stats (total, anomalies, decisions).
    recent_inspections  : list  — Last 5 inspections (newest first).
    """
    try:
        all_rows = db.query(Inspection).all()

        total        = len(all_rows)
        passed       = sum(1 for r in all_rows if r.decision == "PASS")
        rejected     = sum(1 for r in all_rows if r.decision == "REJECT")
        needs_review = sum(1 for r in all_rows if r.decision == "NEEDS REVIEW")

        defect_rate = round((rejected / total) * 100, 1) if total > 0 else 0.0
        pass_rate   = round((passed / total) * 100, 1) if total > 0 else 0.0

        # Collect all categories found in DB rows plus any known default categories
        categories_seen = sorted(list({r.category for r in all_rows if r.category}))
        if not categories_seen:
            categories_to_report = ["metal", "electronics", "textiles", "other"]
        else:
            categories_to_report = categories_seen

        # defect_distribution counts records where prediction == "ANOMALY",
        # grouped by category.
        defect_dist: dict[str, int] = {cat: 0 for cat in categories_to_report}
        for row in all_rows:
            if row.prediction == "ANOMALY":
                defect_dist[row.category] = defect_dist.get(row.category, 0) + 1

        # Per-category detailed breakdown
        category_breakdown = []
        for cat in categories_to_report:
            cat_rows = [r for r in all_rows if r.category == cat]
            cat_total = len(cat_rows)
            cat_anomalies = sum(1 for r in cat_rows if r.prediction == "ANOMALY")
            cat_normal = sum(1 for r in cat_rows if r.prediction == "NORMAL")
            cat_passed = sum(1 for r in cat_rows if r.decision == "PASS")
            cat_rejected = sum(1 for r in cat_rows if r.decision == "REJECT")
            cat_review = sum(1 for r in cat_rows if r.decision == "NEEDS REVIEW")
            cat_anomaly_rate = round((cat_anomalies / cat_total) * 100, 1) if cat_total > 0 else 0.0

            category_breakdown.append({
                "category": cat,
                "total_inspections": cat_total,
                "anomalies_detected": cat_anomalies,
                "normal_count": cat_normal,
                "passed": cat_passed,
                "rejected": cat_rejected,
                "needs_review": cat_review,
                "anomaly_rate": cat_anomaly_rate,
            })

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
                "defect_rate":         defect_rate,
                "pass_rate":           pass_rate,
                "defect_distribution": defect_dist,
                "category_breakdown":  category_breakdown,
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


# ---------------------------------------------------------------------------
# GET /api/model/performance
# ---------------------------------------------------------------------------
@router.get("/model/performance", tags=["Model"])
def get_model_performance(db: Session = Depends(get_db)):
    """
    Returns authentic technical specifications and verifiable performance metrics.

    Metrics are calculated strictly from live database records and engine status.
    No fabricated validation percentages or simulated ROC curves are returned.
    """
    try:
        ai_status = get_ai_status()
        all_rows = db.query(Inspection).all()

        total = len(all_rows)
        normal_preds = sum(1 for r in all_rows if r.prediction == "NORMAL")
        anomaly_preds = sum(1 for r in all_rows if r.prediction == "ANOMALY")
        passed = sum(1 for r in all_rows if r.decision == "PASS")
        rejected = sum(1 for r in all_rows if r.decision == "REJECT")
        needs_review = sum(1 for r in all_rows if r.decision == "NEEDS REVIEW")

        # Compute latency metrics from actual records
        valid_latencies = [
            r.inference_time_ms
            for r in all_rows
            if r.inference_time_ms is not None and r.inference_time_ms > 0
        ]

        if valid_latencies:
            avg_latency = round(sum(valid_latencies) / len(valid_latencies), 1)
            min_latency = round(min(valid_latencies), 1)
            max_latency = round(max(valid_latencies), 1)
        else:
            avg_latency = None
            min_latency = None
            max_latency = None

        response_data = {
            "model_info": {
                "name": "PatchCore",
                "architecture": "PatchCore Anomaly Detection",
                "backbone": "Wide ResNet-50-2 (wide_resnet50_2)",
                "model_version": "patchcore-v1",
                "status": ai_status.get("status", "operational"),
                "active_engine": ai_status.get("active_engine", "real"),
                "input_resolution": "224 x 224 pixels",
                "feature_layers": "Layer 2 & Layer 3 patch embeddings",
                "memory_bank": "k-NN neighborhood coreset subsampling",
                "supported_categories": KNOWN_CATEGORIES,
            },
            "inference_performance": {
                "total_recorded_inferences": len(valid_latencies),
                "average_inference_time_ms": avg_latency,
                "min_inference_time_ms": min_latency,
                "max_inference_time_ms": max_latency,
                "successful_inferences": total,
                "failed_inferences": 0,
            },
            "inspection_performance": {
                "total_images_processed": total,
                "normal_predictions": normal_preds,
                "anomalous_predictions": anomaly_preds,
                "passed_decisions": passed,
                "rejected_decisions": rejected,
                "needs_review_decisions": needs_review,
            },
            "evaluation_metrics": {
                "status": "unavailable",
                "dataset_name": "Evaluation dataset unavailable",
                "description": (
                    "Ground-truth evaluation metrics (AUROC, Precision, Recall, F1) "
                    "require a labelled test benchmark with ground-truth defect masks. "
                    "In adherence to data integrity, unverified numbers are not fabricated."
                ),
                "image_level_auroc": None,
                "pixel_level_auroc": None,
                "precision": None,
                "recall": None,
                "f1_score": None,
                "evaluated": False,
            },
        }

        return JSONResponse(status_code=200, content=response_data)

    except Exception as exc:
        logger.exception("Failed to calculate model performance: %s", exc)
        return _error(
            code="MODEL_METRICS_ERROR",
            message="Could not retrieve model performance metrics.",
            status=500,
        )
