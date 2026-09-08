from pydantic import BaseModel, model_validator
from typing import Optional, List, Literal


class ChatRequest(BaseModel):
    message: str
    language: str = "en"          # ISO 639-1: "en", "hi", "ta", "te", "bn", "kn", "ml"
    user_id: Optional[str] = None # used to maintain per-user conversation history
    patient_id: Optional[str] = None
    location: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    language: str
    matched_scheme: Optional[str] = None  # Indian government health scheme, if detected
    disclaimer: Optional[str] = None      # health safety notice
    is_emergency: bool = False
    emergency_details: Optional[str] = None
    provider: Optional[str] = None        # 'groq', 'ollama', or 'offline'


class ChatMessage(BaseModel):
    """Single message in the conversation history."""
    role: Literal["user", "assistant"]
    content: str


class ChatHistoryResponse(BaseModel):
    """Full conversation history for a user session."""
    user_id: str
    messages: List[ChatMessage]
    count: int = 0

    @model_validator(mode="after")
    def set_count(self) -> "ChatHistoryResponse":
        self.count = len(self.messages)
        return self
