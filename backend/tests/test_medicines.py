"""
Tests for Medicines, Drug Interactions, and Prescriptions.
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


def test_medicines_and_interactions(client, auth_headers):
    # 1. Search formulary
    search_res = client.get("/api/v1/medicines/search?query=paracetamol", headers=auth_headers)
    assert search_res.status_code == 200
    medicines = search_res.json()
    assert len(medicines) >= 1
    assert "Paracetamol" in medicines[0]["brand_name"] or "Paracetamol" in medicines[0]["generic_name"]

    # 2. Check safety - Drug-Drug interaction (e.g. Aspirin + Warfarin)
    safety_res = client.post("/api/v1/medicines/check-safety", json={
        "medicine_names": ["Aspirin", "Warfarin"]
    }, headers=auth_headers)
    assert safety_res.status_code == 200
    safety_body = safety_res.json()
    assert safety_body["has_warnings"] is True
    assert len(safety_body["drug_interactions"]) >= 1
    assert "bleeding" in safety_body["drug_interactions"][0]["description"].lower()

    # 3. Check safety with Patient Allergy contraindication
    pat_res = client.post("/api/v1/patients", json={
        "name": "Allergic Patient",
        "gender": "male",
        "age": 28,
        "village": "Perur",
        "allergies": "Amoxicillin, Penicillin"
    }, headers=auth_headers)
    assert pat_res.status_code == 200
    patient_id = pat_res.json()["id"]

    allergy_res = client.post("/api/v1/medicines/check-safety", json={
        "patient_id": patient_id,
        "medicine_names": ["Amoxicillin 500mg"]
    }, headers=auth_headers)
    assert allergy_res.status_code == 200
    allergy_body = allergy_res.json()
    assert allergy_body["has_warnings"] is True
    assert len(allergy_body["allergy_warnings"]) >= 1

    # 4. Create Prescription
    rx_payload = {
        "patient_id": patient_id,
        "prescriber_name": "Dr. Selvam (MBBS)",
        "items": [
            {
                "medicine_name": "Paracetamol 500mg",
                "dosage": "500mg",
                "frequency": "TID (3 times/day)",
                "duration_days": 3,
                "instructions": "After food"
            }
        ],
        "notes": "Monitor body temperature daily"
    }
    rx_res = client.post("/api/v1/medicines/prescriptions", json=rx_payload, headers=auth_headers)
    assert rx_res.status_code == 200
    rx_body = rx_res.json()
    assert rx_body["patient_id"] == patient_id
    assert len(rx_body["items"]) == 1

    # 5. Get Patient Prescriptions
    list_rx = client.get(f"/api/v1/medicines/prescriptions/patient/{patient_id}", headers=auth_headers)
    assert list_rx.status_code == 200
    assert len(list_rx.json()) >= 1
