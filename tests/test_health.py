"""
Smoke tests to confirm the app boots and all 4 module routers respond.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_module_pings():
    for path in [
        "/api/v1/assistant/ping",
        "/api/v1/rag/ping",
        "/api/v1/outbreak/ping",
        "/api/v1/worker/ping",
    ]:
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
