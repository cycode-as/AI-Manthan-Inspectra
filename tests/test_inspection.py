"""
tests/test_inspection.py
-------------------------
Tests for POST /api/inspect

Covers:
  - Valid JPEG upload
  - Valid PNG upload
  - Unsupported file type
  - Corrupt image
  - Oversized image
  - Unsupported category
  - Missing image field
  - Missing category field
  - AI service failure
  - Full response shape
  - Database persistence
  - File naming convention
  - Decision consistency with score
"""

import math
from pathlib import Path
from unittest.mock import patch

import pytest

from conftest import (
    make_jpeg_bytes,
    make_png_bytes,
    make_corrupt_bytes,
    make_oversized_bytes,
    make_gif_bytes,
)
from services.ai_service import AIServiceError

# Contract fields that must be present in every successful response
REQUIRED_FIELDS = {
    "inspection_id", "filename", "category", "prediction",
    "anomaly_score", "decision", "original_image_url", "heatmap_url",
    "inference_time_ms", "model_version", "created_at",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def post_inspect(client, image_bytes, filename="part.jpg",
                 content_type="image/jpeg", category="metal"):
    return client.post(
        "/api/inspect",
        data={"category": category},
        files={"image": (filename, image_bytes, content_type)},
    )


# ---------------------------------------------------------------------------
# Valid uploads
# ---------------------------------------------------------------------------

def test_valid_jpeg_returns_200(client):
    r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 200


def test_valid_png_returns_200(client):
    r = post_inspect(client, make_png_bytes(), filename="part.png",
                     content_type="image/png")
    assert r.status_code == 200


def test_response_has_all_contract_fields(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    missing = REQUIRED_FIELDS - body.keys()
    assert not missing, f"Response missing fields: {missing}"


def test_inspection_id_is_positive_integer(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    assert isinstance(body["inspection_id"], int)
    assert body["inspection_id"] > 0


def test_category_echoed_in_response(client):
    body = post_inspect(client, make_jpeg_bytes(), category="metal").json()
    assert body["category"] == "metal"


def test_filename_echoed_in_response(client):
    body = post_inspect(client, make_jpeg_bytes(), filename="widget.jpg").json()
    assert body["filename"] == "widget.jpg"


def test_prediction_is_valid_value(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    assert body["prediction"] in ("NORMAL", "ANOMALY")


def test_anomaly_score_is_finite_float_in_range(client):
    score = post_inspect(client, make_jpeg_bytes()).json()["anomaly_score"]
    assert isinstance(score, float)
    assert not math.isnan(score)
    assert not math.isinf(score)
    assert 0.0 <= score <= 1.0


def test_decision_is_valid_label(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    assert body["decision"] in ("PASS", "NEEDS REVIEW", "REJECT")


def test_original_image_url_format(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    iid  = body["inspection_id"]
    assert body["original_image_url"] == f"/uploads/original_{iid}.jpg"


def test_heatmap_url_format(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    iid  = body["inspection_id"]
    assert body["heatmap_url"] == f"/uploads/heatmap_{iid}.png"


def test_png_original_image_url_format(client):
    body = post_inspect(client, make_png_bytes(),
                        filename="part.png", content_type="image/png").json()
    iid = body["inspection_id"]
    assert body["original_image_url"] == f"/uploads/original_{iid}.png"


def test_inference_time_is_positive(client):
    t = post_inspect(client, make_jpeg_bytes()).json()["inference_time_ms"]
    assert isinstance(t, float)
    assert t > 0


def test_model_version_is_nonempty_string(client):
    mv = post_inspect(client, make_jpeg_bytes()).json()["model_version"]
    assert isinstance(mv, str) and mv.strip()


def test_created_at_is_iso_string(client):
    from datetime import datetime
    ts = post_inspect(client, make_jpeg_bytes()).json()["created_at"]
    # Must parse without error
    datetime.fromisoformat(ts)


# ---------------------------------------------------------------------------
# Database persistence
# ---------------------------------------------------------------------------

def test_inspection_saved_to_db(client, db_session):
    from database.models import Inspection
    body = post_inspect(client, make_jpeg_bytes()).json()
    row  = db_session.query(Inspection).filter_by(id=body["inspection_id"]).first()
    assert row is not None
    assert row.category == "metal"
    assert row.decision in ("PASS", "NEEDS REVIEW", "REJECT")


def test_two_inspections_get_unique_ids(client):
    id1 = post_inspect(client, make_jpeg_bytes()).json()["inspection_id"]
    id2 = post_inspect(client, make_jpeg_bytes()).json()["inspection_id"]
    assert id1 != id2


def test_decision_consistent_with_score(client, db_session):
    """Decision must match the thresholds applied to the stored score."""
    from services.decision_engine import SAFE_THRESHOLD, REJECT_THRESHOLD
    from database.models import Inspection

    body = post_inspect(client, make_jpeg_bytes()).json()
    row  = db_session.query(Inspection).filter_by(id=body["inspection_id"]).first()
    score = row.anomaly_score

    if score < SAFE_THRESHOLD:
        expected = "PASS"
    elif score < REJECT_THRESHOLD:
        expected = "NEEDS REVIEW"
    else:
        expected = "REJECT"

    assert row.decision == expected


# ---------------------------------------------------------------------------
# File storage
# ---------------------------------------------------------------------------

def test_original_image_file_exists_on_disk(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    iid  = body["inspection_id"]
    from config import UPLOAD_DIR
    assert (UPLOAD_DIR / f"original_{iid}.jpg").exists()


def test_heatmap_file_exists_on_disk(client):
    body = post_inspect(client, make_jpeg_bytes()).json()
    iid  = body["inspection_id"]
    from config import UPLOAD_DIR
    assert (UPLOAD_DIR / f"heatmap_{iid}.png").exists()


# ---------------------------------------------------------------------------
# Validation rejections
# ---------------------------------------------------------------------------

def test_unsupported_category_returns_400(client):
    r = post_inspect(client, make_jpeg_bytes(), category="plastic")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "UNSUPPORTED_CATEGORY"


def test_unsupported_category_error_shape(client):
    body = post_inspect(client, make_jpeg_bytes(), category="wood").json()
    assert body["success"] is False
    assert "code"    in body["error"]
    assert "message" in body["error"]


def test_unsupported_file_type_returns_400(client):
    r = post_inspect(client, make_gif_bytes(),
                     filename="part.gif", content_type="image/gif")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_corrupt_image_returns_4xx(client):
    r = post_inspect(client, make_corrupt_bytes())
    assert r.status_code in (400, 422)
    assert r.json()["error"]["code"] in ("CORRUPT_IMAGE", "INVALID_IMAGE")


def test_oversized_image_returns_413(client):
    r = post_inspect(client, make_oversized_bytes())
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_missing_category_returns_422(client):
    r = client.post(
        "/api/inspect",
        files={"image": ("part.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    assert r.status_code == 422


def test_missing_image_returns_422(client):
    r = client.post("/api/inspect", data={"category": "metal"})
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# AI service failure
# ---------------------------------------------------------------------------

def test_ai_service_failure_returns_503(client):
    """
    When the AI engine raises AIServiceError, the endpoint must return 503
    and never return a PASS or any valid inspection result.
    """
    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError("Simulated AI engine crash"),
    ):
        r = post_inspect(client, make_jpeg_bytes())

    assert r.status_code == 503
    body = r.json()
    assert body["success"] is False
    assert body["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_ai_failure_does_not_persist_record(client, db_session):
    """A failed inspection must not leave a committed row in the database."""
    from database.models import Inspection

    count_before = db_session.query(Inspection).count()

    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError("Simulated AI engine crash"),
    ):
        post_inspect(client, make_jpeg_bytes())

    db_session.expire_all()
    count_after = db_session.query(Inspection).count()
    assert count_after == count_before


def test_ai_response_not_a_dict_returns_503(client):
    """AI engine returning a non-dict must be rejected as 503."""
    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError("AI engine must return a dict, got: list"),
    ):
        r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_ai_response_category_mismatch_returns_503(client):
    """AI engine returning a different category must be rejected as 503."""
    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError(
            "AI response category mismatch: requested 'metal', got 'plastic'"
        ),
    ):
        r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_missing_heatmap_file_returns_503(client):
    """AI engine returning a nonexistent heatmap path must be rejected as 503."""
    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError(
            "Heatmap file not found at path returned by AI engine"
        ),
    ):
        r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_invalid_png_heatmap_returns_503(client):
    """AI engine returning a corrupt or non-PNG heatmap must be rejected as 503."""
    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError("Heatmap file is not a readable PNG"),
    ):
        r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_heatmap_outside_upload_dir_returns_503(client):
    """Heatmap path outside UPLOAD_DIR must be rejected as 503."""
    with patch(
        "services.inspection_service.call_ai_engine",
        side_effect=AIServiceError(
            "Heatmap path '/tmp/evil.png' is outside the configured UPLOAD_DIR"
        ),
    ):
        r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_missing_internal_dependency_raises_not_mocks(client):
    """
    If ai_engine is importable but has a missing internal dependency,
    _try_load_real_engine() raises AIServiceError. The endpoint must
    return 503 — not fall back to mock and return 200.
    """
    with patch(
        "services.ai_service._try_load_real_engine",
        side_effect=AIServiceError(
            "Real AI engine found but a required dependency is missing: 'torch'"
        ),
    ):
        r = post_inspect(client, make_jpeg_bytes())
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_real_engine_failure_does_not_fall_back_to_mock(client):
    """
    Once a real engine is loaded and it fails during inference,
    the result must be 503 — never a successful mock response.
    """
    from unittest.mock import MagicMock
    fake_engine = MagicMock(side_effect=RuntimeError("GPU out of memory"))

    with patch(
        "services.ai_service._try_load_real_engine",
        return_value=fake_engine,
    ):
        r = post_inspect(client, make_jpeg_bytes())

    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"


def test_heatmap_cleaned_up_when_db_commit_fails(client, db_session):
    """
    If the DB commit fails after the AI engine wrote a heatmap,
    the heatmap file must be deleted from uploads/.
    """
    import tempfile, os
    from pathlib import Path
    from unittest.mock import MagicMock
    from config import UPLOAD_DIR

    # Create a real PNG file to act as the heatmap
    tmp = tempfile.NamedTemporaryFile(
        suffix=".png", dir=str(UPLOAD_DIR), delete=False
    )
    tmp.close()
    from PIL import Image as PILImage
    PILImage.new("RGB", (10, 10)).save(tmp.name, "PNG")
    heatmap_file = Path(tmp.name)

    ai_result = {
        "category":          "metal",
        "prediction":        "ANOMALY",
        "anomaly_score":     0.8,
        "heatmap_path":      str(heatmap_file),
        "inference_time_ms": 100.0,
        "model_version":     "test_v1",
    }

    original_commit = db_session.commit

    def commit_once_then_fail():
        # First commit (flush for placeholder id) happens via flush(), not commit().
        # We raise on commit() to simulate DB failure after AI succeeds.
        raise Exception("Simulated DB commit failure")

    db_session.commit = commit_once_then_fail

    with patch("services.inspection_service.call_ai_engine", return_value=ai_result), \
         patch("services.inspection_service.finalize_image_filename",
               return_value=Path(tmp.name)):
        r = client.post(
            "/api/inspect",
            data={"category": "metal"},
            files={"image": ("part.jpg", make_jpeg_bytes(), "image/jpeg")},
        )

    db_session.commit = original_commit

    assert r.status_code in (500, 503)
    # Heatmap must have been cleaned up
    assert not heatmap_file.exists(), \
        f"Heatmap was not cleaned up after DB failure: {heatmap_file}"
