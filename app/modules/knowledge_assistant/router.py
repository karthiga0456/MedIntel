"""
API routes for the AI Medical Knowledge Assistant module.
"""
from fastapi import APIRouter

from app.modules.knowledge_assistant.schemas import ChatRequest, ChatResponse
from app.modules.knowledge_assistant.service import knowledge_assistant_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Send a message to the multilingual health chatbot."""
    return knowledge_assistant_service.chat(request)


@router.get("/ping")
def ping():
    return {"module": "knowledge_assistant", "status": "ok"}
