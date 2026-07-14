"""
API routes for the Healthcare RAG System module.
"""
from fastapi import APIRouter, UploadFile, File

from app.modules.healthcare_rag.schemas import (
    DocumentQueryRequest,
    DocumentQueryResponse,
    UploadResponse,
)
from app.modules.healthcare_rag.service import healthcare_rag_service

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a medical report / prescription (PDF or image) for indexing."""
    content = await file.read()
    return healthcare_rag_service.ingest_document(file.filename, content)


@router.post("/query", response_model=DocumentQueryResponse)
def query_documents(request: DocumentQueryRequest):
    """Ask a question about previously uploaded medical documents."""
    return healthcare_rag_service.query(request)


@router.get("/ping")
def ping():
    return {"module": "healthcare_rag", "status": "ok"}
