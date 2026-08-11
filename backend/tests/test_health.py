"""
Smoke tests — confirm the app boots cleanly and all core endpoints respond.

Run with:
    pytest tests/ -v
"""
import pathlib
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import init_db


# ── Test fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """
    Ensure the SQLite tables exist before any test that touches the DB.
    This mirrors what the lifespan startup hook does in production.
    """
    pathlib.Path("./data/local_db").mkdir(parents=True, exist_ok=True)
    init_db()


@pytest.fixture(scope="session")
def client(setup_db):  # noqa: F811 — depends on setup_db running first
    """
    Session-scoped TestClient. Using the context-manager form triggers
    the FastAPI lifespan so startup hooks also run inside tests.
    """
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── Health & root ─────────────────────────────────────────────────────────────

def test_health_endpoint(client):
    """GET /health should return JSON with status=healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "app" in body


def test_root_serves_html(client):
    """
    GET / serves the SPA index.html (HTML, not JSON).
    We only assert 200 / 404 — body is HTML served by FileResponse.
    404 is acceptable when frontend/index.html hasn't been built yet.
    """
    response = client.get("/")
    assert response.status_code in (200, 404)


# ── Module ping endpoints ─────────────────────────────────────────────────────

def test_module_pings(client):
    """Every module router must expose a /ping that returns status=ok."""
    ping_paths = [
        "/api/v1/assistant/ping",
        "/api/v1/rag/ping",
        "/api/v1/outbreak/ping",
        "/api/v1/worker/ping",
    ]
    for path in ping_paths:
        response = client.get(path)
        assert response.status_code == 200, f"Ping failed for {path}"
        body = response.json()
        assert body.get("status") == "ok", f"Unexpected body for {path}: {body}"


# ── Health Worker Portal CRUD ─────────────────────────────────────────────────

def test_create_health_record(client):
    """POST /api/v1/worker/records should persist a record and return it."""
    payload = {
        "patient_name": "Ravi Kumar",
        "village": "Thanjavur",
        "age": 34,
        "symptoms": "fever, cough",
        "vaccination_status": "fully_vaccinated",
        "worker_id": "worker-test-001",
    }
    response = client.post("/api/v1/worker/records", json=payload)
    assert response.status_code == 200, f"Create record failed: {response.text}"
    body = response.json()
    assert body["patient_name"] == "Ravi Kumar"
    assert body["worker_id"] == "worker-test-001"
    assert "id" in body
    assert body["synced"] is False


def test_list_health_records(client):
    """GET /api/v1/worker/records should return a list."""
    response = client.get("/api/v1/worker/records")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_records_filtered_by_worker(client):
    """GET /api/v1/worker/records?worker_id=X should filter correctly."""
    response = client.get("/api/v1/worker/records?worker_id=worker-test-001")
    assert response.status_code == 200
    records = response.json()
    for r in records:
        assert r["worker_id"] == "worker-test-001"


# ── Knowledge Assistant stub ──────────────────────────────────────────────────

def test_assistant_chat_stub(client):
    """POST /api/v1/assistant/chat should return a reply field."""
    response = client.post(
        "/api/v1/assistant/chat",
        json={"message": "What is dengue fever?", "language": "en"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "reply" in body
    assert "language" in body


# ── RAG System stub ───────────────────────────────────────────────────────────

def test_rag_query_stub(client):
    """POST /api/v1/rag/query should return an answer field."""
    response = client.post(
        "/api/v1/rag/query",
        json={"query": "dengue treatment guidelines"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "answer" in body


# ── Outbreak Prediction stub ──────────────────────────────────────────────────

def test_outbreak_predict_stub(client):
    """POST /api/v1/outbreak/predict should return risk_level and predicted_cases."""
    response = client.post(
        "/api/v1/outbreak/predict",
        json={
            "region": "Coimbatore",
            "disease": "dengue",
            "recent_case_counts": [10, 12, 15, 18],
            "weather_features": {"temp": 30, "humidity": 80},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "risk_level" in body
    assert "predicted_cases_next_7_days" in body
