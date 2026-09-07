"""
Tests for Emergency Rapid Response Triage module.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers():
    token = create_access_token(data={"sub": "admin@medintel.gov", "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


def test_emergency_triage_lifecycle(client, auth_headers):
    # 1. Report emergency incident
    payload = {
        "patient_name": "Emergency Patient",
        "symptoms": "Acute chest pain, radiating down left arm, diaphoresis",
        "severity": "CRITICAL",
        "location": "Alandurai Ward 2",
        "notes": "Possible acute myocardial infarction"
    }
    create_res = client.post("/api/v1/emergency", json=payload, headers=auth_headers)
    assert create_res.status_code == 200
    emergency_case = create_res.json()
    assert emergency_case["severity"] == "CRITICAL"
    assert emergency_case["status"] == "PENDING"
    case_id = emergency_case["id"]

    # 2. Query emergency queue
    queue_res = client.get("/api/v1/emergency?severity=CRITICAL", headers=auth_headers)
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert any(c["id"] == case_id for c in queue)

    # 3. Dispatch worker
    patch_res = client.patch(f"/api/v1/emergency/{case_id}", json={
        "status": "DISPATCHED",
        "assigned_worker_id": "worker-unit-1"
    }, headers=auth_headers)
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "DISPATCHED"
    assert updated["assigned_worker_id"] == "worker-unit-1"

    # 4. Resolve emergency
    resolve_res = client.patch(f"/api/v1/emergency/{case_id}", json={
        "status": "RESOLVED"
    }, headers=auth_headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
