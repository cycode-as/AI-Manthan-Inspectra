"""
services/ai_service.py
-----------------------
Adapter between the backend and the AI engine.

CONTRACT (agreed with Member 1 — AI Engine):
    inspect_image(image_path: str, category: str, output_heatmap_path: str | None = None) -> dict

    Expected return keys:
        category          str        — must exactly match the requested category
        prediction        str        — "NORMAL" | "ANOMALY"
        anomaly_score     float      — [0.0, 1.0]
        heatmap_path      str | None — path to a saved, readable PNG inside UPLOAD_DIR,
                                       or None if pixel-level localization is unavailable
        inference_time_ms float      — wall-clock ms taken by the model
        model_version     str        — identifies the model (e.g. "patchcore-v1")

ARCHITECTURE NOTE:
    The public function in this file is call_ai_engine().
    It attempts to import and call the real AI module (ai_engine.inference or ai_engine.predictor).
    If the real module is not yet available, it falls back to the mock.
    Synthetic score-based gradient heatmaps are strictly forbidden. If pixel-level
    localization is not produced by the model, heatmap_path remains None.
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
    #    When present, must:
    #      a) exist on disk
    #      b) resolve inside UPLOAD_DIR (no path traversal)
    #      c) be a readable PNG image
    #    When None, indicates no spatial localization was produced.
    # ------------------------------------------------------------------
    heatmap_raw = result.get("heatmap_path")
    if heatmap_raw is not None:
        heatmap = Path(heatmap_raw)

        if not heatmap.exists():
            raise AIServiceError(
                f"Heatmap file not found at path returned by AI engine: {heatmap}"
            )

        # Resolve both paths to eliminate symlinks / relative segments
        try:
            resolved_heatmap = heatmap.resolve()
            resolved_upload_dir = UPLOAD_DIR.resolve()
            resolved_heatmap.relative_to(resolved_upload_dir)
        except ValueError:
            raise AIServiceError(
                f"Heatmap path '{heatmap}' is outside the configured UPLOAD_DIR "
                f"'{UPLOAD_DIR}'. Heatmaps must be written inside UPLOAD_DIR."
            )

        # Verify the file is a readable PNG
        try:
            from PIL import Image
            img = Image.open(str(resolved_heatmap))
            img.verify()                # structural integrity check
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
    """
    try:
        heatmap = Path(heatmap_path_str)
        if not heatmap.exists():
            return
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
    Simulates AI engine output for development mode.
    Does NOT fabricate a synthetic gradient heatmap.
    """
    logger.warning(
        "MOCK AI ENGINE ACTIVE — results are NOT real model inference. "
        "Replace with real engine before final demonstration."
    )

    mock_latency_ms = random.uniform(80, 200)
    time.sleep(mock_latency_ms / 1000)

    anomaly_score = round(random.uniform(0.05, 0.95), 4)
    prediction    = "ANOMALY" if anomaly_score >= 0.5 else "NORMAL"

    return {
        "category":          category,
        "prediction":        prediction,
        "anomaly_score":     anomaly_score,
        "heatmap_path":      None,
        "inference_time_ms": round(mock_latency_ms, 2),
        "model_version":     f"{category}_mock_v1",
    }


# ---------------------------------------------------------------------------
# Real engine loader
# ---------------------------------------------------------------------------
def _try_load_real_engine():
    """
    Attempts to import the real AI engine module (ai_engine.inference or ai_engine.predictor).
    """
    import importlib

    try:
        try:
            module = importlib.import_module("ai_engine.inference")
        except ModuleNotFoundError as e:
            if e.name in ("ai_engine.inference", None):
                module = importlib.import_module("ai_engine.predictor")
            else:
                raise

    except ModuleNotFoundError as exc:
        missing_name = exc.name or ""
        if missing_name in ("ai_engine", "ai_engine.inference", "ai_engine.predictor"):
            logger.debug("ai_engine package not installed — using mock.")
            return None
        raise AIServiceError(
            f"Real AI engine found but cannot be loaded: "
            f"missing module '{missing_name}'. "
            f"Fix the AI engine installation before continuing."
        ) from exc

    except Exception as exc:
        raise AIServiceError(
            f"Real AI engine failed to import: {exc}"
        ) from exc

    fn = getattr(module, "inspect_image", None)
    if not callable(fn):
        logger.warning(
            "ai_engine found but inspect_image() is not callable."
        )
        return None

    logger.info("Real AI engine loaded successfully.")
    return fn


def get_ai_status() -> dict:
    """
    Diagnostic status of the AI engine for health check.
    """
    try:
        engine = _try_load_real_engine()
        if engine is not None:
            return {
                "active_engine": "real",
                "model_architecture": "PatchCore (wide_resnet50_2)",
                "status": "ready",
            }
        return {
            "active_engine": "mock",
            "model_architecture": "None (Mock Engine)",
            "status": "fallback",
        }
    except AIServiceError as err:
        return {
            "active_engine": "unavailable",
            "model_architecture": "PatchCore",
            "status": "error",
            "error": str(err),
        }


# ---------------------------------------------------------------------------
# Public entry point — called by inspection_service
# ---------------------------------------------------------------------------
def call_ai_engine(image_path: str, category: str, inspection_id: int) -> dict:
    """
    Calls the AI engine and returns a validated result dict.
    If the real engine produces an actual anomaly map, it is saved to
    UPLOAD_DIR / heatmap_{inspection_id}.png.
    If no genuine anomaly map is generated, heatmap_path is None (never fabricated).
    """
    real_engine = _try_load_real_engine()

    if real_engine is not None:
        logger.info(
            "Calling real AI engine | image=%s category=%s", image_path, category
        )
        target_heatmap = str(UPLOAD_DIR / f"heatmap_{inspection_id}.png")
        try:
            try:
                result = real_engine(image_path, category, target_heatmap)
            except TypeError:
                result = real_engine(image_path, category)
        except Exception as exc:
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

    # Validate regardless of source
    try:
        _validate_ai_response(result, category)
    except AIServiceError:
        if isinstance(result, dict):
            raw_heatmap = result.get("heatmap_path")
            if raw_heatmap:
                _cleanup_heatmap_on_validation_failure(raw_heatmap)
        raise

    return result
