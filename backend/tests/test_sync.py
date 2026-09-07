"""
Tests for Resilient Offline Sync module.
"""
import uuid
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


def test_batch_sync_idempotency(client, auth_headers):
    client_uuid = f"offline-test-{uuid.uuid4()}"

    batch_payload = {
        "worker_id": "worker-asha-1",
        "items": [
            {
                "client_uuid": client_uuid,
                "entity_type": "patient",
                "payload": {
                    "name": "Synced Offline Patient",
                    "gender": "female",
                    "age": 29,
                    "village": "Perur",
                    "phone": "+919988776655"
                }
            }
        ]
    }

    # First sync attempt
    sync_res1 = client.post("/api/v1/sync/batch", json=batch_payload, headers=auth_headers)
    assert sync_res1.status_code == 200
    res1 = sync_res1.json()
    assert res1["synced_count"] == 1
    assert client_uuid in res1["synced_uuids"]

    # Second sync attempt with SAME client_uuid (must be idempotent duplicate)
    sync_res2 = client.post("/api/v1/sync/batch", json=batch_payload, headers=auth_headers)
    assert sync_res2.status_code == 200
    res2 = sync_res2.json()
    assert res2["duplicates_ignored"] == 1
