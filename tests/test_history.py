"""
tests/test_history.py
----------------------
Tests for GET /api/history and GET /api/history/{inspection_id}
"""

from conftest import make_jpeg_bytes

REQUIRED_FIELDS = {
    "inspection_id", "filename", "category", "prediction",
    "anomaly_score", "decision", "original_image_url", "heatmap_url",
    "inference_time_ms", "model_version", "created_at",
}


def _submit(client, category="metal"):
    """Helper — submits one inspection and returns the response body."""
    r = client.post(
        "/api/inspect",
        data={"category": category},
        files={"image": ("part.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    assert r.status_code == 200, f"Inspection seed failed: {r.text}"
    return r.json()


# ---------------------------------------------------------------------------
# GET /api/history
# ---------------------------------------------------------------------------

def test_history_returns_200_on_empty_db(client):
    r = client.get("/api/history")
    assert r.status_code == 200


def test_history_empty_db_has_correct_shape(client):
    body = client.get("/api/history").json()
    assert body["total"]       == 0
    assert body["inspections"] == []
    assert "limit" in body
    assert "skip"  in body


def test_history_returns_submitted_records(client):
    _submit(client)
    _submit(client)
    body = client.get("/api/history").json()
    assert body["total"] == 2
    assert len(body["inspections"]) == 2


def test_history_records_have_all_contract_fields(client):
    _submit(client)
    items = client.get("/api/history").json()["inspections"]
    missing = REQUIRED_FIELDS - items[0].keys()
    assert not missing, f"Missing fields: {missing}"


def test_history_ordered_newest_first(client):
    id1 = _submit(client)["inspection_id"]
    id2 = _submit(client)["inspection_id"]
    items = client.get("/api/history").json()["inspections"]
    ids = [i["inspection_id"] for i in items]
    assert ids.index(id2) < ids.index(id1)


def test_history_limit_parameter(client):
    for _ in range(5):
        _submit(client)
    body = client.get("/api/history?limit=3").json()
    assert len(body["inspections"]) == 3
    assert body["limit"] == 3


def test_history_skip_parameter(client):
    ids = [_submit(client)["inspection_id"] for _ in range(4)]
    # skip=2 with default order (newest first) should skip the 2 newest
    body_full  = client.get("/api/history").json()["inspections"]
    body_skip2 = client.get("/api/history?skip=2").json()["inspections"]
    assert body_skip2[0]["inspection_id"] == body_full[2]["inspection_id"]


def test_history_total_is_accurate(client):
    _submit(client)
    _submit(client)
    _submit(client)
    assert client.get("/api/history").json()["total"] == 3


def test_history_limit_clamped_to_200(client):
    r = client.get("/api/history?limit=9999")
    assert r.status_code == 200
    assert r.json()["limit"] == 200


# ---------------------------------------------------------------------------
# GET /api/history/{inspection_id}
# ---------------------------------------------------------------------------

def test_get_by_id_returns_200(client):
    iid = _submit(client)["inspection_id"]
    assert client.get(f"/api/history/{iid}").status_code == 200


def test_get_by_id_returns_correct_record(client):
    submitted = _submit(client)
    fetched   = client.get(f"/api/history/{submitted['inspection_id']}").json()
    assert fetched["inspection_id"] == submitted["inspection_id"]
    assert fetched["category"]      == submitted["category"]
    assert fetched["decision"]      == submitted["decision"]


def test_get_by_id_has_all_contract_fields(client):
    iid  = _submit(client)["inspection_id"]
    body = client.get(f"/api/history/{iid}").json()
    missing = REQUIRED_FIELDS - body.keys()
    assert not missing, f"Missing fields: {missing}"


def test_get_by_id_nonexistent_returns_404(client):
    r = client.get("/api/history/999999")
    assert r.status_code == 404


def test_get_by_id_404_has_error_shape(client):
    body = client.get("/api/history/999999").json()
    assert body["success"] is False
    assert body["error"]["code"] == "INSPECTION_NOT_FOUND"
    assert "message" in body["error"]
