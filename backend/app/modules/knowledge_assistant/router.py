"""
API routes for the AI Medical Knowledge Assistant module.

Endpoints:
  POST /api/v1/assistant/chat              — Send a health query, receive AI response
  GET  /api/v1/assistant/history/{user_id} — Retrieve conversation history
  DELETE /api/v1/assistant/history/{user_id} — Clear conversation history
  GET  /api/v1/assistant/ping              — Health check
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

from app.modules.knowledge_assistant.schemas import (
    ChatRequest,
    ChatResponse,
    ChatHistoryResponse,
)
from app.modules.knowledge_assistant.service import knowledge_assistant_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Send a health query to the AI Medical Knowledge Assistant.

    - Supports multilingual responses (pass `language` ISO code: en/hi/ta/te/bn/kn/ml)
    - Maintains per-user conversation history when `user_id` is provided
    - Automatically detects and surfaces relevant Indian government health schemes
    - Performs emergency triage; persists critical alerts
    - Appends a health safety disclaimer to all responses
    """
    return knowledge_assistant_service.chat(request, db=db)


@router.get("/history/{user_id}", response_model=ChatHistoryResponse)
def get_history(user_id: str):
    """
    Retrieve the full conversation history for a given user session.
    History is stored in-memory and cleared when the server restarts.
    """
    return knowledge_assistant_service.get_history(user_id)


@router.delete("/history/{user_id}")
def clear_history(user_id: str):
    """
    Clear the conversation history for a user (e.g., on 'New Chat').
    Returns a confirmation message.
    """
    knowledge_assistant_service.clear_history(user_id)
    return {"message": f"Conversation history cleared for user '{user_id}'."}


@router.get("/ping")
def ping():
    """Liveness probe for the module."""
    return {"module": "knowledge_assistant", "status": "ok"}
