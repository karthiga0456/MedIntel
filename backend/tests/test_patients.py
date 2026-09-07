"""
Tests for Patient Management module.
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


def test_create_and_get_patient(client, auth_headers):
    # 1. Create Patient
    payload = {
        "name": "Aarav Krishnan",
        "gender": "male",
        "age": 34,
        "village": "Alandurai",
        "phone": "+919876543210",
        "allergies": "Penicillin",
        "chronic_conditions": "Hypertension",
        "blood_group": "B+"
    }
    create_res = client.post("/api/v1/patients", json=payload, headers=auth_headers)
    assert create_res.status_code == 200
    patient = create_res.json()
    assert patient["name"] == "Aarav Krishnan"
    assert patient["uhid"].startswith("UHID-")
    patient_id = patient["id"]

    # 2. Get Patient by ID
    get_res = client.get(f"/api/v1/patients/{patient_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["uhid"] == patient["uhid"]

    # 3. Add Consultation
    consult_payload = {
        "chief_complaint": "Acute persistent cough and evening fever",
        "diagnosis": "Suspected Bronchitis",
        "vitals": {"bp": "125/82", "temperature": "100.4F", "pulse": 84},
        "notes": "Advised rest, warm fluids, and follow-up in 3 days"
    }
    consult_res = client.post(f"/api/v1/patients/{patient_id}/consultations", json=consult_payload, headers=auth_headers)
    assert consult_res.status_code == 200
    consultation = consult_res.json()
    assert "id" in consultation

    # 4. Fetch Timeline
    timeline_res = client.get(f"/api/v1/patients/{patient_id}/timeline", headers=auth_headers)
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert len(timeline) >= 1
    assert any(item["event_type"] == "CONSULTATION" for item in timeline)

    # 5. List with village filter
    list_res = client.get("/api/v1/patients?village=Alandurai", headers=auth_headers)
    assert list_res.status_code == 200
    list_body = list_res.json()
    assert list_body["total"] >= 1
    assert any(p["id"] == patient_id for p in list_body["items"])
