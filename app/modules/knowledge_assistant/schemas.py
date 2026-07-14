"""
Pydantic request/response models for the AI Medical Knowledge Assistant.
"""
from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    message: str
    language: str = "en"        # e.g. "en", "hi", "ta" ...
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    language: str
    matched_scheme: Optional[str] = None   # government health scheme, if matched
