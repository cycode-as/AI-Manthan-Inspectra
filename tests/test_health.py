"""
tests/test_health.py
---------------------
Tests for the core endpoints: GET / and GET /health
"""


def test_root_returns_200(client):
    r = client.get("/")
    assert r.status_code == 200


def test_root_response_fields(client):
    body = client.get("/").json()
    assert body["message"] == "Welcome to Inspectra 2.0"
    assert body["status"]  == "running"
    assert body["version"] == "2.0.0"


def test_health_returns_200(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_health_response_fields(client):
    body = client.get("/health").json()
    assert body["status"]  == "healthy"
    assert body["service"] == "Inspectra Backend"
