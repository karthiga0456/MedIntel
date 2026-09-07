"""
API routes for Healthcare RAG System.
"""
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import MedicalDocument
from app.core.security import require_roles, get_token_payload
from app.modules.healthcare_rag.schemas import (
    DocumentQueryRequest,
    DocumentQueryResponse,
    UploadResponse,
    DocumentInfo,
)
from app.modules.healthcare_rag.service import healthcare_rag_service

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    doc_type: str = Form("medical_report"),
    db: Session = Depends(get_db),
):
    """Upload a medical report or prescription (PDF / image) with optional patient scoping."""
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File size exceeds maximum 10MB limit.")

    return healthcare_rag_service.ingest_document(
        db=db,
        filename=file.filename,
        content=content,
        patient_id=patient_id,
        doc_type=doc_type,
    )


@router.post("/query", response_model=DocumentQueryResponse)
def query_documents(
    request: DocumentQueryRequest,
    db: Session = Depends(get_db),
):
    """Ask clinical questions against indexed medical records (scoped by patient if provided)."""
    return healthcare_rag_service.query(db, request)


@router.get("/patient/{patient_id}", response_model=List[DocumentInfo])
def get_patient_documents(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve all uploaded documents for a specific patient."""
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).all()
    return docs


@router.get("/ping")
def ping():
    return {"module": "healthcare_rag", "status": "ok"}
