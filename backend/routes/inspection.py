"""
routes/inspection.py
--------------------
POST /api/inspect

Accepts a product image + category, runs the full inspection pipeline,
persists the result, and returns the structured inspection response.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config import SUPPORTED_CATEGORIES
from database.database import get_db
from services.image_service import ImageValidationError, validate_and_save, cleanup_file
from services.inspection_service import InspectionError, run_inspection

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Error response builder — matches the error contract exactly
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
# POST /api/inspect
# ---------------------------------------------------------------------------
@router.post("/inspect", tags=["Inspection"])
async def inspect_image(
    image:    UploadFile  = File(...,  description="Industrial product image (JPEG or PNG, max 10 MB)"),
    category: str         = Form(...,  description="Product category (e.g. 'metal')"),
    db:       Session     = Depends(get_db),
):
    """
    Upload an industrial product image for defect inspection.

    - Validates image format, size, and content.
    - Calls the AI engine for anomaly detection and heatmap generation.
    - Applies the decision engine (PASS / NEEDS REVIEW / REJECT).
    - Persists the full result to SQLite.
    - Returns the inspection result matching the frontend contract.
    """

    # ------------------------------------------------------------------
    # 1. Validate category
    # ------------------------------------------------------------------
    category = category.strip().lower()
    if category not in SUPPORTED_CATEGORIES:
        return _error(
            code    = "UNSUPPORTED_CATEGORY",
            message = f"Category '{category}' is not supported. "
                      f"Supported: {', '.join(sorted(SUPPORTED_CATEGORIES))}.",
            status  = 400,
        )

    # ------------------------------------------------------------------
    # 2. Validate and save image to a temporary file
    # ------------------------------------------------------------------
    tmp_path: Path | None = None
    try:
        tmp_path = await validate_and_save(image)

    except ImageValidationError as exc:
        return _error(code=exc.code, message=exc.message, status=exc.status)

    except Exception as exc:
        if tmp_path:
            cleanup_file(tmp_path)
        logger.exception("Unexpected error during image validation: %s", exc)
        return _error(
            code    = "INTERNAL_ERROR",
            message = "An unexpected error occurred. Please try again.",
            status  = 500,
        )

    # ------------------------------------------------------------------
    # 3. Run the full inspection pipeline
    # ------------------------------------------------------------------
    try:
        result = run_inspection(
            tmp_image_path    = tmp_path,
            original_filename = image.filename or "upload",
            category          = category,
            db                = db,
        )
        return JSONResponse(status_code=200, content=result)

    except InspectionError as exc:
        return _error(code=exc.code, message=exc.message, status=exc.status)

    except Exception as exc:
        if tmp_path:
            cleanup_file(tmp_path)
        logger.exception("Unexpected inspection error: %s", exc)
        return _error(
            code    = "INTERNAL_ERROR",
            message = "An unexpected error occurred during inspection.",
            status  = 500,
        )
