"""
services/inspection_service.py
-------------------------------
Orchestrates the complete inspection workflow:

  1. Receive validated upload (already saved as tmp file by image_service)
  2. Insert a placeholder DB row to reserve a unique inspection_id
  3. Rename the image to  original_{id}.{ext}
  4. Call the AI engine
  5. Validate the AI response
  6. Apply the decision engine
  7. Update the DB row with full results and commit
  8. Return the structured response dict

Error handling and cleanup
--------------------------
  heatmap_path is tracked as soon as the AI call returns it.
  On any failure after the AI call:
    - original image (final_image_path) is deleted
    - heatmap (heatmap_path) is deleted
  On failure before the AI call but after rename:
    - final_image_path is deleted
  On failure before the rename:
    - tmp_image_path is deleted
  DB is always rolled back on failure.
  Cleanup never touches files from prior successful inspections.
"""

import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from database.models import Inspection
from services.ai_service import call_ai_engine, AIServiceError
from services.decision_engine import make_decision
from services.image_service import finalize_image_filename, cleanup_file

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception — carries HTTP status for the route to use
# ---------------------------------------------------------------------------
class InspectionError(Exception):
    def __init__(self, code: str, message: str, status: int):
        super().__init__(message)
        self.code    = code
        self.message = message
        self.status  = status


# ---------------------------------------------------------------------------
# Public entry point — called by the route handler
# ---------------------------------------------------------------------------
def run_inspection(
    tmp_image_path: Path,
    original_filename: str,
    category: str,
    db: Session,
) -> dict:
    """
    Runs the full inspection pipeline for one uploaded image.

    Parameters
    ----------
    tmp_image_path     : Path    — Temporary file path from image_service.
    original_filename  : str     — Original filename from the upload.
    category           : str     — Validated product category.
    db                 : Session — SQLAlchemy session (injected by route).

    Returns
    -------
    dict  — Full inspection result matching the frontend API contract.

    Raises
    ------
    InspectionError  — On AI failure or DB error. Route maps this to JSON.
    """
    placeholder_row   = None
    final_image_path: Path | None = None
    heatmap_path: Path | None     = None     # tracked as soon as AI returns it

    try:
        # ------------------------------------------------------------------
        # STEP 1 — Insert a placeholder row to get a real DB-assigned ID.
        #          flush() assigns .id without committing; row not yet visible.
        # ------------------------------------------------------------------
        placeholder_row = Inspection(
            filename            = original_filename,
            category            = category,
            prediction          = "PENDING",
            anomaly_score       = 0.0,
            decision            = "PENDING",
            original_image_path = str(tmp_image_path),
            heatmap_path        = "",
            inference_time_ms   = 0.0,
            model_version       = "",
            created_at          = datetime.utcnow(),
        )
        db.add(placeholder_row)
        db.flush()
        inspection_id = placeholder_row.id
        logger.info(
            "Reserved inspection_id=%d for file=%s", inspection_id, original_filename
        )

        # ------------------------------------------------------------------
        # STEP 2 — Rename temp file → original_{id}.{ext}
        # ------------------------------------------------------------------
        final_image_path = finalize_image_filename(tmp_image_path, inspection_id)
        logger.info("Image finalized: %s", final_image_path.name)

        # ------------------------------------------------------------------
        # STEP 3 — Call the AI engine
        # ------------------------------------------------------------------
        ai_result = call_ai_engine(
            image_path    = str(final_image_path),
            category      = category,
            inspection_id = inspection_id,
        )

        # Track heatmap immediately so cleanup can find it on later failures
        heatmap_path = Path(ai_result["heatmap_path"])

        # ------------------------------------------------------------------
        # STEP 4 — Apply the decision engine
        # ------------------------------------------------------------------
        decision = make_decision(ai_result["anomaly_score"])

        # ------------------------------------------------------------------
        # STEP 5 — Update the placeholder row with real results and commit
        # ------------------------------------------------------------------
        placeholder_row.prediction          = ai_result["prediction"]
        placeholder_row.anomaly_score       = ai_result["anomaly_score"]
        placeholder_row.decision            = decision
        placeholder_row.original_image_path = str(final_image_path)
        placeholder_row.heatmap_path        = str(heatmap_path)
        placeholder_row.inference_time_ms   = ai_result["inference_time_ms"]
        placeholder_row.model_version       = ai_result["model_version"]

        db.commit()
        db.refresh(placeholder_row)
        logger.info(
            "Inspection complete | id=%d decision=%s score=%.4f",
            inspection_id, decision, ai_result["anomaly_score"],
        )

        # ------------------------------------------------------------------
        # STEP 6 — Build and return the response (matches frontend contract)
        # ------------------------------------------------------------------
        return {
            "inspection_id":      inspection_id,
            "filename":           original_filename,
            "category":           category,
            "prediction":         ai_result["prediction"],
            "anomaly_score":      ai_result["anomaly_score"],
            "decision":           decision,
            "original_image_url": f"/uploads/{final_image_path.name}",
            "heatmap_url":        f"/uploads/{heatmap_path.name}",
            "inference_time_ms":  ai_result["inference_time_ms"],
            "model_version":      ai_result["model_version"],
            "created_at":         placeholder_row.created_at.isoformat(),
        }

    except AIServiceError as exc:
        logger.error(
            "AI engine failed for inspection_id=%s: %s",
            inspection_id if placeholder_row else "?", exc,
        )
        db.rollback()
        _cleanup_on_failure(tmp_image_path, final_image_path, heatmap_path)
        raise InspectionError(
            code    = "AI_SERVICE_UNAVAILABLE",
            message = "The AI inspection engine encountered an error. Please try again.",
            status  = 503,
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected error during inspection workflow: %s", exc)
        db.rollback()
        _cleanup_on_failure(tmp_image_path, final_image_path, heatmap_path)
        raise InspectionError(
            code    = "INTERNAL_ERROR",
            message = "An unexpected error occurred during inspection.",
            status  = 500,
        ) from exc


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _cleanup_on_failure(
    tmp_path: Path | None,
    final_path: Path | None,
    heatmap_path: Path | None,
) -> None:
    """
    Best-effort cleanup of files belonging to a failed inspection.

    Rules:
    - If the original image was renamed to final_path, delete final_path.
    - Otherwise delete tmp_path (rename never happened).
    - Always delete heatmap_path if it exists (AI wrote it before failing).
    - Never raises — cleanup failure is logged but not propagated.
    - Never touches files from prior successful inspections because
      each inspection has a unique ID in its filename.
    """
    if final_path:
        cleanup_file(final_path)
    elif tmp_path:
        cleanup_file(tmp_path)

    if heatmap_path:
        cleanup_file(heatmap_path)
