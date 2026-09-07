from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Medicine, Prescription
from app.core.security import require_roles
from app.modules.medicines import schemas, service

router = APIRouter()


@router.get("/search", response_model=List[schemas.MedicineResponse])
def search_medicines(
    query: str,
    db: Session = Depends(get_db),
):
    """Search medications catalog by generic name, brand, or category."""
    service.medicine_service.seed_initial_medicines(db)
    return service.medicine_service.search_medicines(db, query)


@router.post("/check-safety", response_model=schemas.PrescriptionValidationResult)
def check_prescription_safety(
    data: schemas.SafetyCheckRequest,
    db: Session = Depends(get_db),
):
    """Check for drug-drug interactions and patient drug allergies."""
    return service.medicine_service.check_safety(db, data.patient_id, data.medicine_names)


@router.post("/prescriptions", response_model=schemas.PrescriptionResponse)
def create_prescription(
    data: schemas.PrescriptionCreate,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Create a new prescription with real-time allergy and interaction screening."""
    return service.medicine_service.create_prescription(db, data)


@router.get("/prescriptions/patient/{patient_id}")
def get_patient_prescriptions(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full medication and prescription history for a patient."""
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.issue_date.desc()).all()
    out = []
    for p in prescriptions:
        out.append({
            "id": p.id,
            "prescriber_name": p.prescriber_name,
            "issue_date": p.issue_date,
            "status": p.status,
            "notes": p.notes,
            "items": [
                {
                    "medicine_name": i.medicine_name,
                    "dosage": i.dosage,
                    "frequency": i.frequency,
                    "duration_days": i.duration_days,
                }
                for i in p.items
            ],
        })
    return out


@router.post("/prescriptions/ocr")
async def ocr_prescription(
    file: UploadFile = File(...),
):
    """Parse an uploaded physical prescription using OCR to extract medications."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Prescription file is empty")
    return service.medicine_service.parse_prescription_file(file.filename, content)
