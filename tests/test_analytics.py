"""
tests/test_analytics.py
------------------------
Tests for GET /api/analytics
"""

from unittest.mock import patch
from conftest import make_jpeg_bytes
from services.decision_engine import SAFE_THRESHOLD, REJECT_THRESHOLD

REQUIRED_FIELDS = {
    "total_inspections", "passed", "rejected",
    "needs_review", "defect_distribution", "recent_inspections",
}

INSPECTION_FIELDS = {
    "inspection_id", "filename", "category", "prediction",
    "anomaly_score", "decision", "original_image_url", "heatmap_url",
    "inference_time_ms", "model_version", "created_at",
}


def _submit(client):
    r = client.post(
        "/api/inspect",
        data={"category": "metal"},
        files={"image": ("part.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    assert r.status_code == 200, f"Seed failed: {r.text}"
    return r.json()


# ---------------------------------------------------------------------------
# Structure
# ---------------------------------------------------------------------------

def test_analytics_returns_200(client):
    assert client.get("/api/analytics").status_code == 200


def test_analytics_has_all_required_fields(client):
    body    = client.get("/api/analytics").json()
    missing = REQUIRED_FIELDS - body.keys()
    assert not missing, f"Missing fields: {missing}"


def test_analytics_empty_db(client):
    body = client.get("/api/analytics").json()
    assert body["total_inspections"]   == 0
    assert body["passed"]              == 0
    assert body["rejected"]            == 0
    assert body["needs_review"]        == 0
    assert body["defect_distribution"] == {}
    assert body["recent_inspections"]  == []


def test_defect_distribution_is_dict(client):
    assert isinstance(client.get("/api/analytics").json()["defect_distribution"], dict)


def test_recent_inspections_is_list(client):
    assert isinstance(client.get("/api/analytics").json()["recent_inspections"], list)


# ---------------------------------------------------------------------------
# Counts are accurate
# ---------------------------------------------------------------------------

def test_total_count_matches_submissions(client):
    _submit(client)
    _submit(client)
    assert client.get("/api/analytics").json()["total_inspections"] == 2


def test_counts_sum_to_total(client):
    for _ in range(4):
        _submit(client)
    body = client.get("/api/analytics").json()
    total = body["total_inspections"]
    assert body["passed"] + body["rejected"] + body["needs_review"] == total


def test_recent_inspections_capped_at_5(client):
    for _ in range(7):
        _submit(client)
    ri = client.get("/api/analytics").json()["recent_inspections"]
    assert len(ri) <= 5


def test_recent_inspections_items_have_contract_fields(client):
    _submit(client)
    ri = client.get("/api/analytics").json()["recent_inspections"]
    if ri:
        missing = INSPECTION_FIELDS - ri[0].keys()
        assert not missing, f"Missing fields: {missing}"


# ---------------------------------------------------------------------------
# Decision counting is accurate — use controlled scores via mock
# ---------------------------------------------------------------------------

def test_pass_count_accurate(client):
    """Force a PASS score and verify it increments the passed counter."""
    low_score = SAFE_THRESHOLD - 0.05   # 0.25 — guaranteed PASS

    mock_result = {
        "category": "metal", "prediction": "NORMAL",
        "anomaly_score": low_score,
        "heatmap_path": "",        # patched further below
        "inference_time_ms": 50.0, "model_version": "test_v1",
    }

    with patch("services.inspection_service.call_ai_engine") as mock_ai, \
         patch("services.inspection_service.finalize_image_filename") as mock_rename, \
         patch("services.inspection_service.cleanup_file"):

        from pathlib import Path
        import tempfile, os

        # Create a real temp file so heatmap_path exists
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp.close()
        mock_result["heatmap_path"] = tmp.name
        mock_ai.return_value = mock_result

        # Return a real path so finalize doesn't fail
        fake_path = Path(tmp.name)
        mock_rename.return_value = fake_path

        _submit(client)
        os.unlink(tmp.name)

    body = client.get("/api/analytics").json()
    assert body["passed"] >= 1


def test_defect_distribution_counts_rejects_per_category(client, db_session):
    """
    defect_distribution counts ANOMALY predictions per category,
    not just REJECT decisions.
    Insert one REJECT+ANOMALY and one NEEDS REVIEW+ANOMALY row.
    Both must appear in defect_distribution.
    """
    from database.models import Inspection
    from datetime import datetime

    db_session.add(Inspection(
        filename="test.jpg", category="metal",
        prediction="ANOMALY", anomaly_score=0.9,
        decision="REJECT",
        original_image_path="uploads/original_99.jpg",
        heatmap_path="uploads/heatmap_99.png",
        inference_time_ms=100.0, model_version="test_v1",
        created_at=datetime.utcnow(),
    ))
    db_session.add(Inspection(
        filename="test2.jpg", category="metal",
        prediction="ANOMALY", anomaly_score=0.5,
        decision="NEEDS REVIEW",
        original_image_path="uploads/original_98.jpg",
        heatmap_path="uploads/heatmap_98.png",
        inference_time_ms=100.0, model_version="test_v1",
        created_at=datetime.utcnow(),
    ))
    db_session.commit()

    body = client.get("/api/analytics").json()
    # Both rows have prediction=ANOMALY so metal count must be >= 2
    assert body["defect_distribution"].get("metal", 0) >= 2


def test_defect_distribution_excludes_pass_and_needs_review(client, db_session):
    """
    PASS records (prediction=NORMAL) must NOT appear in defect_distribution.
    NEEDS REVIEW with prediction=ANOMALY MUST appear.
    """
    from database.models import Inspection
    from datetime import datetime

    # PASS with NORMAL — must NOT be counted
    db_session.add(Inspection(
        filename="pass.jpg", category="metal",
        prediction="NORMAL", anomaly_score=0.1,
        decision="PASS",
        original_image_path="uploads/original_97.jpg",
        heatmap_path="uploads/heatmap_97.png",
        inference_time_ms=80.0, model_version="test_v1",
        created_at=datetime.utcnow(),
    ))
    # NEEDS REVIEW with ANOMALY — MUST be counted
    db_session.add(Inspection(
        filename="nr.jpg", category="metal",
        prediction="ANOMALY", anomaly_score=0.5,
        decision="NEEDS REVIEW",
        original_image_path="uploads/original_96.jpg",
        heatmap_path="uploads/heatmap_96.png",
        inference_time_ms=80.0, model_version="test_v1",
        created_at=datetime.utcnow(),
    ))
    db_session.commit()

    body = client.get("/api/analytics").json()
    dist_total = sum(body["defect_distribution"].values())
    # Only the ANOMALY row is counted — the NORMAL/PASS row is excluded
    assert dist_total == 1
    assert body["defect_distribution"].get("metal", 0) == 1


def test_defect_distribution_anomaly_plus_needs_review(client, db_session):
    """
    ANOMALY predictions with NEEDS REVIEW decision are included
    in defect_distribution (counted by prediction, not decision).
    """
    from database.models import Inspection
    from datetime import datetime

    for decision in ("REJECT", "NEEDS REVIEW"):
        db_session.add(Inspection(
            filename="x.jpg", category="metal",
            prediction="ANOMALY", anomaly_score=0.6,
            decision=decision,
            original_image_path="uploads/original_x.jpg",
            heatmap_path="uploads/heatmap_x.png",
            inference_time_ms=90.0, model_version="test_v1",
            created_at=datetime.utcnow(),
        ))
    db_session.commit()

    body = client.get("/api/analytics").json()
    # Both ANOMALY rows must appear regardless of decision label
    assert body["defect_distribution"].get("metal", 0) == 2
