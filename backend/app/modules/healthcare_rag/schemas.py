"""
Pydantic request/response models for the Healthcare RAG System.
"""
from pydantic import BaseModel
from typing import List, Optional


class DocumentQueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None   # scope search to a single uploaded doc


class DocumentQueryResponse(BaseModel):
    answer: str
    sources: List[str] = []


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_indexed: int
