from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class DocumentQueryRequest(BaseModel):
    query: str
    patient_id: Optional[str] = None     # Isolate search to a specific patient
    document_id: Optional[str] = None    # Scope search to a single document


class DocumentQueryResponse(BaseModel):
    answer: str
    sources: List[str] = []
    relevant_passages: List[str] = []
    patient_id: Optional[str] = None
    confidence: Optional[float] = None


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_indexed: int
    patient_id: Optional[str] = None
    extracted_preview: Optional[str] = None


class DocumentInfo(BaseModel):
    id: str
    title: str
    doc_type: str
    patient_id: Optional[str] = None
    indexed_chunks: int
    created_at: datetime

    model_config = {"from_attributes": True}
