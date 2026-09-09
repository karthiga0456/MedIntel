import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_token_payload, require_roles
from app.core.audit import log_audit_event
from app.modules.patients import schemas, service

router = APIRouter()


@router.post("", response_model=schemas.PatientResponse)
def register_patient(
    data: schemas.PatientCreate,
    request: Request,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Register a new patient into the public health database."""
    patient = service.create_patient(db, data)
    log_audit_event(
        db,
        user_id=token_payload.get("user_id"),
        action="PATIENT_CREATED",
        resource="patient",
        resource_id=patient.id,
        result="SUCCESS",
        ip_address=request.client.host if request and request.client else None,
    )
    return patient


@router.get("", response_model=schemas.PatientListResponse)
def list_patients(
    query: Optional[str] = Query(None, description="Search term for name, UHID, phone, village"),
    village: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    vaccination_status: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """List registered patients with search, filtering, and pagination."""
    items, total = service.list_patients(
        db=db,
        query_str=query,
        village=village,
        gender=gender,
        vaccination_status=vaccination_status,
        include_archived=include_archived,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        size=size,
    )
    pages = math.ceil(total / size) if size > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/{patient_id}", response_model=schemas.PatientDetailResponse)
def get_patient_details(
    patient_id: str,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve full patient clinical profile and timeline."""
    patient = service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    timeline = service.get_patient_timeline(db, patient_id)

    return {
        "id": patient.id,
        "uhid": patient.uhid,
        "name": patient.name,
        "age": patient.age,
        "dob": patient.dob,
        "gender": patient.gender,
        "phone": patient.phone,
        "address": patient.address,
        "village": patient.village,
        "emergency_contact": patient.emergency_contact,
        "blood_group": patient.blood_group,
        "allergies": patient.allergies,
        "chronic_conditions": patient.chronic_conditions,
        "vaccination_status": patient.vaccination_status,
        "is_archived": patient.is_archived,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at,
        "medical_history": [
            {"id": h.id, "condition": h.condition, "diagnosed_date": h.diagnosed_date, "notes": h.notes}
            for h in patient.medical_history
        ],
        "consultations": [
            {"id": c.id, "complaint": c.chief_complaint, "diagnosis": c.diagnosis, "date": c.consultation_date}
            for c in patient.consultations
        ],
        "prescriptions": [
            {"id": p.id, "prescriber": p.prescriber_name, "date": p.issue_date, "status": p.status}
            for p in patient.prescriptions
        ],
        "lab_reports": [
            {"id": lr.id, "title": lr.title, "type": lr.test_type, "date": lr.report_date, "summary": lr.summary}
            for lr in patient.lab_reports
        ],
        "vaccinations": [
            {"id": v.id, "name": v.vaccine_name, "dose": v.dose_number, "status": v.status, "date": v.administered_date}
            for v in patient.vaccinations
        ],
        "timeline": timeline,
    }


@router.put("/{patient_id}", response_model=schemas.PatientResponse)
def update_patient(
    patient_id: str,
    data: schemas.PatientUpdate,
    request: Request,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Update patient demographic and medical profile."""
    updated = service.update_patient(db, patient_id, data)
    log_audit_event(
        db,
        user_id=token_payload.get("user_id"),
        action="PATIENT_UPDATED",
        resource="patient",
        resource_id=patient_id,
        result="SUCCESS",
        ip_address=request.client.host if request and request.client else None,
    )
    return updated


@router.delete("/{patient_id}")
def archive_patient(
    patient_id: str,
    request: Request,
    token_payload: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    """Admin-only: Archive patient profile."""
    service.archive_patient(db, patient_id)
    log_audit_event(
        db,
        user_id=token_payload.get("user_id"),
        action="PATIENT_ARCHIVED",
        resource="patient",
        resource_id=patient_id,
        result="SUCCESS",
        ip_address=request.client.host if request and request.client else None,
    )
    return {"message": "Patient archived successfully"}


@router.get("/{patient_id}/timeline", response_model=List[schemas.TimelineEvent])
def get_timeline(
    patient_id: str,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve full chronological medical record timeline."""
    return service.get_patient_timeline(db, patient_id)


@router.post("/{patient_id}/consultations")
def add_consultation(
    patient_id: str,
    data: schemas.ConsultationCreate,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Log a clinical consultation for a patient."""
    c = service.add_consultation(db, patient_id, data)
    return {"id": c.id, "message": "Consultation logged successfully"}
