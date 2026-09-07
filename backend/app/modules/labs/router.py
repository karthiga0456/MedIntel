from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles
from app.modules.labs import schemas, service

router = APIRouter()


@router.post("/upload", response_model=schemas.LabReportUploadResponse)
async def upload_lab_report(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    test_type: str = Form("Complete Blood Count (CBC)"),
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """
    Upload and analyze patient lab report (PDF/image).
    Extracts biomarker values, classifies against reference ranges, and persists results.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded lab report file is empty")

    return service.lab_analyzer_service.process_and_save_report(
        db=db,
        patient_id=patient_id,
        filename=file.filename,
        content=content,
        test_type=test_type,
    )


@router.get("/patient/{patient_id}", response_model=schemas.LabHistoryResponse)
def get_patient_lab_history(
    patient_id: str,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve full historical lab test results and biomarker time trends for a patient."""
    return service.lab_analyzer_service.get_patient_lab_history(db, patient_id)


@router.get("/ping")
def ping():
    return {"module": "labs", "status": "ok"}
