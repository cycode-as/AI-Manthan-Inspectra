"""
services/ai_service.py
-----------------------
Adapter between the backend and the AI engine.

CONTRACT (agreed with Member 1 — AI Engine):
    inspect_image(image_path: str, category: str) -> dict

    Expected return keys:
        category          str   — must exactly match the requested category
        prediction        str   — "NORMAL" | "ANOMALY"
        anomaly_score     float — [0.0, 1.0]
        heatmap_path      str   — path to a saved, readable PNG inside UPLOAD_DIR
        inference_time_ms float — wall-clock ms taken by the model
        model_version     str   — identifies the model (e.g. "metal_v1")

ARCHITECTURE NOTE:
    The public function in this file is call_ai_engine().
    It attempts to import and call the real AI module.
    If the real module is not yet available (ModuleNotFoundError on
    "ai_engine" itself), it falls back to the mock.
    If the real module IS found but has a missing internal dependency,
    that is raised as AIServiceError — we do NOT fall back to mock
    in that case, because the engine exists but is broken.

⚠  MOCK IS ACTIVE — results are randomly generated and do NOT reflect
   real model inference.  Do NOT use mock output in the final demonstration.
"""

import logging
import math
import random
import time
from pathlib import Path

from config import UPLOAD_DIR

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception — signals AI failure to the inspection service
# ---------------------------------------------------------------------------
class AIServiceError(Exception):
    """
    Raised when the AI engine cannot produce a result.
    The inspection service must treat this as a hard error (503),
    never as a PASS or any valid prediction.
    """
    pass


# ---------------------------------------------------------------------------
# Response validator — runs regardless of mock or real engine
# ---------------------------------------------------------------------------
def _validate_ai_response(result: object, category: str) -> None:
    """
    Validates the value returned by the AI engine against the agreed contract.
    Raises AIServiceError if the response is not a dict, has missing/wrong
    fields, or returns a heatmap that is not a readable PNG inside UPLOAD_DIR.

    This runs on BOTH the mock and the real engine output.
    """
    # ------------------------------------------------------------------
    # 0. Must be a dict
    # ------------------------------------------------------------------
    if not isinstance(result, dict):
        raise AIServiceError(
            f"AI engine must return a dict, got: {type(result).__name__}"
        )

    # ------------------------------------------------------------------
    # 1. Required keys present
    # ------------------------------------------------------------------
    required_keys = {
        "category", "prediction", "anomaly_score",
        "heatmap_path", "inference_time_ms", "model_version",
    }
    missing = required_keys - result.keys()
    if missing:
        raise AIServiceError(f"AI response missing required keys: {missing}")

    # ------------------------------------------------------------------
    # 2. category must exactly match the requested category
    # ------------------------------------------------------------------
    if result["category"] != category:
        raise AIServiceError(
            f"AI response category mismatch: requested '{category}', "
            f"got '{result['category']}'"
        )

    # ------------------------------------------------------------------
    # 3. prediction must be exactly one of two strings
    # ------------------------------------------------------------------
    if result["prediction"] not in ("NORMAL", "ANOMALY"):
        raise AIServiceError(
            f"AI prediction must be 'NORMAL' or 'ANOMALY', "
            f"got: {result['prediction']!r}"
        )

    # ------------------------------------------------------------------
    # 4. anomaly_score must be a finite number in [0, 1]
    # ------------------------------------------------------------------
    score = result["anomaly_score"]
    if not isinstance(score, (int, float)):
        raise AIServiceError(f"anomaly_score must be numeric, got: {type(score)}")
    if math.isnan(score) or math.isinf(score):
        raise AIServiceError(f"anomaly_score must be finite, got: {score}")
    if not (0.0 <= score <= 1.0):
        raise AIServiceError(f"anomaly_score must be in [0.0, 1.0], got: {score}")

    # ------------------------------------------------------------------
    # 5. inference_time_ms must be a non-negative number
    # ------------------------------------------------------------------
    t = result["inference_time_ms"]
    if not isinstance(t, (int, float)) or math.isnan(t) or t < 0:
        raise AIServiceError(
            f"inference_time_ms must be a non-negative number, got: {t}"
        )

    # ------------------------------------------------------------------
    # 6. heatmap_path validation
    #    a) File must exist
    #    b) Path must resolve inside UPLOAD_DIR (no path traversal)
    #    c) File must be a readable PNG (Pillow verify)
    # ------------------------------------------------------------------
    heatmap = Path(result["heatmap_path"])

    if not heatmap.exists():
        raise AIServiceError(
            f"Heatmap file not found at path returned by AI engine: {heatmap}"
        )

    # Resolve both paths to eliminate symlinks / relative segments
    try:
        resolved_heatmap   = heatmap.resolve()
        resolved_upload_dir = UPLOAD_DIR.resolve()
        resolved_heatmap.relative_to(resolved_upload_dir)
    except ValueError:
        raise AIServiceError(
            f"Heatmap path '{heatmap}' is outside the configured UPLOAD_DIR "
            f"'{UPLOAD_DIR}'. Heatmaps must be written inside UPLOAD_DIR."
        )

    # Verify the file is a readable PNG
    try:
        from PIL import Image, UnidentifiedImageError
        img = Image.open(str(resolved_heatmap))
        img.verify()                # structural integrity check
        # After verify() the image object is consumed; re-open to check format
        img2 = Image.open(str(resolved_heatmap))
        if img2.format != "PNG":
            raise AIServiceError(
                f"Heatmap must be a PNG file, got format: {img2.format}"
            )
    except AIServiceError:
        raise
    except Exception as exc:
        raise AIServiceError(
            f"Heatmap file is not a readable PNG: {exc}"
        ) from exc

    # ------------------------------------------------------------------
    # 7. model_version must be a non-empty string
    # ------------------------------------------------------------------
    if not isinstance(result["model_version"], str) or not result["model_version"].strip():
        raise AIServiceError("model_version must be a non-empty string")


# ---------------------------------------------------------------------------
# Heatmap cleanup helper — used when _validate_ai_response fails
# ---------------------------------------------------------------------------
def _cleanup_heatmap_on_validation_failure(heatmap_path_str: str) -> None:
    """
    Deletes a heatmap file written by the AI engine when validation fails.

    Safety constraints:
    - Only deletes files that resolve inside UPLOAD_DIR.
    - Silently skips files outside UPLOAD_DIR (never touches foreign paths).
    - Never raises — failure is logged only.

    This is called exclusively from call_ai_engine() when
    _validate_ai_response() raises AIServiceError after the engine has
    already written a heatmap to disk.
    """
    try:
        heatmap = Path(heatmap_path_str)
        if not heatmap.exists():
            return
        # Only clean up files inside UPLOAD_DIR — security invariant
        try:
            heatmap.resolve().relative_to(UPLOAD_DIR.resolve())
        except ValueError:
            logger.warning(
                "Validation-failure cleanup skipped: heatmap '%s' is outside "
                "UPLOAD_DIR — will not delete.", heatmap
            )
            return
        heatmap.unlink()
        logger.info(
            "Cleaned up heatmap after validation failure: %s", heatmap.name
        )
    except Exception as exc:
        logger.warning(
            "Could not clean up heatmap '%s' after validation failure: %s",
            heatmap_path_str, exc
        )


# ---------------------------------------------------------------------------
# MOCK implementation
# ---------------------------------------------------------------------------
def _mock_inspect_image(image_path: str, category: str, inspection_id: int) -> dict:
    """
    Simulates AI engine output for backend development.

    ⚠  MOCK — randomly generated scores. Not real model inference.

    Generates a real heatmap PNG inside UPLOAD_DIR so the rest of the
    pipeline (file serving, frontend) works end-to-end.
    """
    logger.warning(
        "MOCK AI ENGINE ACTIVE — results are NOT real model inference. "
        "Replace with real engine before final demonstration."
    )

    # Simulate inference latency
    mock_latency_ms = random.uniform(80, 200)
    time.sleep(mock_latency_ms / 1000)

    # Random anomaly score
    anomaly_score = round(random.uniform(0.05, 0.95), 4)
    prediction    = "ANOMALY" if anomaly_score >= 0.5 else "NORMAL"

    # --- Generate a real heatmap PNG inside UPLOAD_DIR -------------------
    from PIL import Image
    import numpy as np

    width, height = 224, 224
    r = int(anomaly_score * 255)
    g = int((1 - abs(anomaly_score - 0.5) * 2) * 180)
    b = int((1 - anomaly_score) * 255)

    arr = np.zeros((height, width, 3), dtype=np.uint8)
    for row in range(height):
        blend = row / height
        arr[row, :, 0] = int(r * blend)
        arr[row, :, 1] = int(g * blend)
        arr[row, :, 2] = int(b * (1 - blend * 0.5))

    heatmap_img  = Image.fromarray(arr, "RGB")
    heatmap_name = f"heatmap_{inspection_id}.png"
    heatmap_path = UPLOAD_DIR / heatmap_name
    heatmap_img.save(str(heatmap_path), "PNG")

    return {
        "category":          category,
        "prediction":        prediction,
        "anomaly_score":     anomaly_score,
        "heatmap_path":      str(heatmap_path),
        "inference_time_ms": round(mock_latency_ms, 2),
        "model_version":     f"{category}_mock_v1",
    }


# ---------------------------------------------------------------------------
# Real engine loader
# ---------------------------------------------------------------------------
def _try_load_real_engine():
    """
    Attempts to import the real AI engine module.

    Returns the inspect_image callable if the module exists and exports it.
    Returns None only if the ai_engine package itself is not installed
    (ModuleNotFoundError whose name is 'ai_engine' or a parent package).

    IMPORTANT: If the ai_engine module IS found but fails to import due to
    a missing internal dependency (e.g. torch, onnxruntime), this raises
    AIServiceError immediately. We do NOT fall back to mock in that case —
    the operator needs to fix the broken environment, not silently get
    random mock predictions.

    UPDATE THIS PATH when Member 1 delivers the AI engine:
        Change 'ai_engine.inference' to the actual module path.
    """
    import importlib

    try:
        module = importlib.import_module("ai_engine.inference")

    except ModuleNotFoundError as exc:
        missing_name = exc.name or ""
        # Return None ONLY when the top-level ai_engine package itself is absent.
        # "ai_engine" not installed at all → safe to use mock (development mode).
        if missing_name == "ai_engine":
            logger.debug("ai_engine package not installed — using mock.")
            return None
        # Any other missing name means either:
        #   • ai_engine.inference submodule is absent (incomplete installation)
        #   • an internal dependency like torch/onnxruntime is missing
        # Both cases indicate a broken/incomplete AI installation — raise, don't mock.
        raise AIServiceError(
            f"Real AI engine found but cannot be loaded: "
            f"missing module '{missing_name}'. "
            f"Fix the AI engine installation before continuing."
        ) from exc

    except Exception as exc:
        # Any other import-time error in the real engine → raise, don't mock
        raise AIServiceError(
            f"Real AI engine failed to import: {exc}"
        ) from exc

    fn = getattr(module, "inspect_image", None)
    if not callable(fn):
        logger.warning(
            "ai_engine.inference module found but inspect_image() is not callable."
        )
        return None

    logger.info("Real AI engine loaded successfully.")
    return fn


# ---------------------------------------------------------------------------
# Public entry point — called by inspection_service
# ---------------------------------------------------------------------------
def call_ai_engine(image_path: str, category: str, inspection_id: int) -> dict:
    """
    Calls the AI engine and returns a validated result dict.

    Tries the real engine first.
      - If ai_engine is not installed → falls back to mock (development mode).
      - If ai_engine is installed but broken → raises AIServiceError immediately.
      - If real engine call raises → raises AIServiceError; never falls back to mock.

    Validates all output before returning — both real and mock.

    Parameters
    ----------
    image_path    : str  — Absolute path to the saved original image.
    category      : str  — Product category (e.g. "metal").
    inspection_id : int  — DB primary key, used for naming the heatmap file.

    Returns
    -------
    dict with keys: category, prediction, anomaly_score, heatmap_path,
                    inference_time_ms, model_version

    Raises
    ------
    AIServiceError
        If the engine fails or returns invalid output.
        The inspection service must treat this as a 503, never as PASS.
    """
    # _try_load_real_engine() may raise AIServiceError for broken environments
    real_engine = _try_load_real_engine()

    if real_engine is not None:
        logger.info(
            "Calling real AI engine | image=%s category=%s", image_path, category
        )
        try:
            result = real_engine(image_path, category)
        except Exception as exc:
            # Real engine failed — do NOT fall back to mock
            raise AIServiceError(
                f"Real AI engine raised an exception: {exc}"
            ) from exc
    else:
        logger.info(
            "Calling mock AI engine | image=%s category=%s", image_path, category
        )
        try:
            result = _mock_inspect_image(image_path, category, inspection_id)
        except Exception as exc:
            raise AIServiceError(
                f"Mock AI engine failed unexpectedly: {exc}"
            ) from exc

    # Validate regardless of source.
    # If validation fails the engine already wrote a heatmap to disk —
    # clean it up here before re-raising so inspection_service doesn't
    # need to know whether a heatmap was written at this point.
    try:
        _validate_ai_response(result, category)
    except AIServiceError:
        # Best-effort: delete the heatmap the engine wrote, if it exists
        # and is inside UPLOAD_DIR. We check isinstance(result, dict) first
        # because the "not a dict" validation path raises before we can
        # extract a path.
        if isinstance(result, dict):
            raw_heatmap = result.get("heatmap_path")
            if raw_heatmap:
                _cleanup_heatmap_on_validation_failure(raw_heatmap)
        raise

    return result
