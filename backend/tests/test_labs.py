"""
Tests for Lab Diagnostic Analyzer module.
"""
import io
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


def test_lab_report_upload_and_analysis(client, auth_headers):
    # 1. Create a test patient
    pat_res = client.post("/api/v1/patients", json={
        "name": "Lab Test Patient",
        "gender": "female",
        "age": 42,
        "village": "Thondamuthur"
    }, headers=auth_headers)
    assert pat_res.status_code == 200
    patient_id = pat_res.json()["id"]

    # 2. Upload text report
    report_content = (
        "COMPLETE BLOOD COUNT REPORT\n"
        "Hemoglobin: 9.2 g/dL\n"
        "Platelet Count: 85000 /mcL\n"
        "White Blood Cells: 14200 /mcL\n"
        "Fasting Blood Sugar: 168 mg/dL\n"
    )
    files = {
        "file": ("lab_report.txt", io.BytesIO(report_content.encode("utf-8")), "text/plain")
    }
    data = {
        "patient_id": patient_id,
        "test_type": "Complete Blood Count (CBC)"
    }

    upload_res = client.post("/api/v1/labs/upload", data=data, files=files, headers=auth_headers)
    assert upload_res.status_code == 200
    res_json = upload_res.json()
    assert res_json["patient_id"] == patient_id
    assert len(res_json["results"]) >= 1

    # Check biomarker statuses classified correctly
    results_map = {r["test_name"]: r for r in res_json["results"]}
    if "Hemoglobin" in results_map:
        assert results_map["Hemoglobin"]["status"] in ("LOW", "CRITICAL")
    if "Platelet Count" in results_map:
        assert results_map["Platelet Count"]["status"] in ("LOW", "CRITICAL")

    # 3. Retrieve patient lab history
    history_res = client.get(f"/api/v1/labs/patient/{patient_id}", headers=auth_headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) >= 1
