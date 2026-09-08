"""
Tests for Nearby Hospitals module using OpenStreetMap.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db


@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


def test_hospitals_ping(client):
    res = client.get("/api/v1/hospitals/ping")
    assert res.status_code == 200
    assert res.json() == {"module": "hospitals", "status": "ok"}
