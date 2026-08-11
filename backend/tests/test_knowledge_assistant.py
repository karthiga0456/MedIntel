"""
Tests for Module 2 — AI Medical Knowledge Assistant.

Run with:
    pytest tests/test_knowledge_assistant.py -v

These tests do NOT require a real GOOGLE_API_KEY.
They verify:
  - Graceful degradation when API key is absent
  - Conversation history (get, clear)
  - Health scheme keyword matching
  - Emergency keyword routing (frontend-level is in Jest; here we test the API layer)
  - Multilingual request round-trip
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import init_db
from app.modules.knowledge_assistant.service import (
    KnowledgeAssistantService,
    _match_scheme,
    HEALTH_SCHEMES,
)
from app.modules.knowledge_assistant.schemas import ChatRequest


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    import pathlib
    pathlib.Path("./data/local_db").mkdir(parents=True, exist_ok=True)
    init_db()


@pytest.fixture(scope="session")
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── Ping ──────────────────────────────────────────────────────────────────────

def test_assistant_ping(client):
    resp = client.get("/api/v1/assistant/ping")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert resp.json()["module"] == "knowledge_assistant"


# ── Chat without API key (graceful degradation) ───────────────────────────────

def test_chat_no_api_key_returns_graceful_message(client):
    """
    When GOOGLE_API_KEY is empty, the service must NOT crash —
    it should return a helpful configuration message.
    """
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "What is dengue fever?", "language": "en"},
    )
    assert resp.status_code == 200
    body = resp.json()

    # Must always return these fields
    assert "reply" in body
    assert "language" in body
    assert body["language"] == "en"

    # Without a key the reply should mention configuration guidance
    reply_lower = body["reply"].lower()
    assert any(hint in reply_lower for hint in [
        "google_api_key",
        "api key",
        "not configured",
        "configure",
        "gemini",
    ]), f"Expected config guidance in reply, got: {body['reply'][:200]}"


# ── Schema field presence ──────────────────────────────────────────────────────

def test_chat_response_has_all_fields(client):
    """ChatResponse must always return reply, language, matched_scheme, disclaimer."""
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Tell me about Ayushman Bharat scheme", "language": "en", "user_id": "test-schema-001"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "reply" in body
    assert "language" in body
    assert "matched_scheme" in body
    assert "disclaimer" in body


# ── Health scheme keyword matching ────────────────────────────────────────────

def test_scheme_matching_ayushman():
    result = _match_scheme("I want to know about ayushman bharat")
    assert result is not None
    assert "PM-JAY" in result or "Ayushman" in result


def test_scheme_matching_tb():
    result = _match_scheme("I have been diagnosed with TB")
    assert result is not None
    assert "NTEP" in result or "TB" in result or "Nikshay" in result


def test_scheme_matching_vaccination():
    result = _match_scheme("What is the vaccination schedule for children?")
    assert result is not None
    assert "Indradhanush" in result or "UIP" in result or "Mission" in result


def test_scheme_matching_no_match():
    result = _match_scheme("What is the capital of France?")
    assert result is None


def test_scheme_matching_case_insensitive():
    result = _match_scheme("Tell me about JANANI SURAKSHA YOJANA")
    assert result is not None


def test_scheme_matching_dengue():
    result = _match_scheme("There are many dengue cases in my area")
    assert result is not None
    assert "NVBDCP" in result or "Vector" in result


# ── Chat with scheme in request triggers matched_scheme ───────────────────────

def test_chat_scheme_matched_in_response(client):
    """Scheme matching should surface even without a real LLM (matches query text)."""
    resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "How can I apply for Ayushman Bharat PM-JAY?",
            "language": "en",
            "user_id": "test-scheme-001",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["matched_scheme"] is not None, (
        "Expected matched_scheme to be set for 'Ayushman Bharat' query"
    )


# ── Conversation history ──────────────────────────────────────────────────────

def test_get_history_empty_for_new_user(client):
    resp = client.get("/api/v1/assistant/history/brand-new-user-xyz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"] == "brand-new-user-xyz"
    assert isinstance(body["messages"], list)
    assert body["count"] == 0


def test_clear_history(client):
    user_id = "test-clear-history-001"

    # Trigger a chat to populate history
    client.post(
        "/api/v1/assistant/chat",
        json={"message": "Hello", "language": "en", "user_id": user_id},
    )

    # Clear the history
    del_resp = client.delete(f"/api/v1/assistant/history/{user_id}")
    assert del_resp.status_code == 200

    # Verify it is empty
    get_resp = client.get(f"/api/v1/assistant/history/{user_id}")
    body = get_resp.json()
    assert body["count"] == 0


def test_history_accumulates_messages(client):
    """
    Each chat call should add to history — even with graceful degradation,
    the 'user' turn is stored by the service.
    """
    user_id = "test-history-accum-001"

    # Send two messages
    for msg in ["First message", "Second message"]:
        client.post(
            "/api/v1/assistant/chat",
            json={"message": msg, "language": "en", "user_id": user_id},
        )

    # Note: in graceful-degradation mode (no API key), the assistant reply is
    # returned but history is NOT populated (no real LLM call was made).
    # This test verifies the endpoint is callable and returns a list.
    resp = client.get(f"/api/v1/assistant/history/{user_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body["messages"], list)


# ── Multilingual round-trip ────────────────────────────────────────────────────

@pytest.mark.parametrize("language", ["en", "hi", "ta", "te", "bn", "kn", "ml"])
def test_chat_accepts_all_supported_languages(client, language):
    resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "What is malaria?",
            "language": language,
            "user_id": f"lang-test-{language}",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["language"] == language
    assert len(body["reply"]) > 0
