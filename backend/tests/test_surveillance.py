"""
Tests for Disease Surveillance and Outbreak Tracking module.
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


def test_surveillance_case_and_summary(client, auth_headers):
    # 1. Report disease cases
    case_payload = {
        "disease": "Dengue Fever",
        "village": "Alandurai",
        "case_count": 5,
        "severity": "severe",
        "notes": "Positive NS1 antigen antigen tests reported in cluster"
    }
    case_res = client.post("/api/v1/surveillance/cases", json=case_payload, headers=auth_headers)
    assert case_res.status_code == 200
    case_body = case_res.json()
    assert case_body["disease"].lower() == "dengue fever"
    assert case_body["village"] == "Alandurai"

    # 2. Fetch Surveillance Summary
    summary_res = client.get("/api/v1/surveillance/summary", headers=auth_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_cases_all_time"] >= 5
    assert "Dengue Fever" in summary["disease_breakdown"]
    assert len(summary["village_statistics"]) >= 1
    assert any(v["village"] == "Alandurai" for v in summary["village_statistics"])

    # 3. Fetch Map Layers
    map_res = client.get("/api/v1/map/layers", headers=auth_headers)
    assert map_res.status_code == 200
    map_data = map_res.json()
    assert "villages" in map_data
    assert "facilities" in map_data
    assert len(map_data["villages"]) >= 1
    assert len(map_data["facilities"]) >= 1
