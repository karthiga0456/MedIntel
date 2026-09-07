from datetime import datetime
import random
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from fastapi import HTTPException

from app.db.models import (
    Patient,
    PatientMedicalHistory,
    Consultation,
    Prescription,
    LabReport,
    Vaccination,
    FieldVisit,
)
from app.modules.patients.schemas import (
    PatientCreate,
    PatientUpdate,
    ConsultationCreate,
    MedicalHistoryItem,
    TimelineEvent,
)


def generate_uhid(db: Session) -> str:
    """Generate unique patient UHID: UHID-YYYY-XXXXXX"""
    year = datetime.utcnow().strftime("%Y")
    for _ in range(10):
        suffix = f"{random.randint(100000, 999999)}"
        candidate = f"UHID-{year}-{suffix}"
        if not db.query(Patient).filter(Patient.uhid == candidate).first():
            return candidate
    return f"UHID-{year}-{int(datetime.utcnow().timestamp())}"


def create_patient(db: Session, data: PatientCreate) -> Patient:
    uhid = data.uhid or generate_uhid(db)
    patient = Patient(
        uhid=uhid,
        name=data.name.strip(),
        age=data.age,
        dob=data.dob,
        gender=data.gender,
        phone=data.phone,
        address=data.address,
        village=data.village.strip(),
        emergency_contact=data.emergency_contact,
        blood_group=data.blood_group,
        allergies=data.allergies,
        chronic_conditions=data.chronic_conditions,
        vaccination_status=data.vaccination_status or "partially_vaccinated",
        is_archived=False,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    if data.initial_history:
        for hist in data.initial_history:
            history_record = PatientMedicalHistory(
                patient_id=patient.id,
                condition=hist.condition,
                diagnosed_date=hist.diagnosed_date,
                notes=hist.notes,
            )
            db.add(history_record)
        db.commit()

    return patient


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def get_patient_by_uhid(db: Session, uhid: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.uhid == uhid).first()


def list_patients(
    db: Session,
    query_str: Optional[str] = None,
    village: Optional[str] = None,
    gender: Optional[str] = None,
    vaccination_status: Optional[str] = None,
    include_archived: bool = False,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    size: int = 20,
) -> Tuple[List[Patient], int]:
    q = db.query(Patient)

    if not include_archived:
        q = q.filter(Patient.is_archived == False)

    if query_str:
        pattern = f"%{query_str}%"
        q = q.filter(
            or_(
                Patient.name.ilike(pattern),
                Patient.uhid.ilike(pattern),
                Patient.phone.ilike(pattern),
                Patient.village.ilike(pattern),
            )
        )

    if village:
        q = q.filter(Patient.village.ilike(f"%{village}%"))

    if gender:
        q = q.filter(Patient.gender == gender)

    if vaccination_status:
        q = q.filter(Patient.vaccination_status == vaccination_status)

    total = q.count()

    order_col = getattr(Patient, sort_by, Patient.created_at)
    if sort_order == "desc":
        q = q.order_by(desc(order_col))
    else:
        q = q.order_by(asc(order_col))

    offset = (page - 1) * size
    items = q.offset(offset).limit(size).all()
    return items, total


def update_patient(db: Session, patient_id: str, data: PatientUpdate) -> Patient:
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(patient, field, val)

    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return patient


def archive_patient(db: Session, patient_id: str) -> Patient:
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.is_archived = True
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return patient


def add_consultation(db: Session, patient_id: str, data: ConsultationCreate) -> Consultation:
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    consultation = Consultation(
        patient_id=patient_id,
        worker_id=data.worker_id,
        chief_complaint=data.chief_complaint,
        diagnosis=data.diagnosis,
        vitals=data.vitals,
        notes=data.notes,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


def get_patient_timeline(db: Session, patient_id: str) -> List[TimelineEvent]:
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    events: List[TimelineEvent] = []

    # 1. Registration
    events.append(
        TimelineEvent(
            id=f"reg-{patient.id}",
            event_type="REGISTRATION",
            title="Patient Registered",
            description=f"{patient.name} registered under UHID {patient.uhid} in {patient.village}",
            timestamp=patient.created_at,
            metadata={"uhid": patient.uhid, "village": patient.village},
        )
    )

    # 2. Consultations
    for c in patient.consultations:
        events.append(
            TimelineEvent(
                id=f"cons-{c.id}",
                event_type="CONSULTATION",
                title=f"Clinical Consultation: {c.chief_complaint}",
                description=f"Diagnosis: {c.diagnosis or 'Under observation'}. Notes: {c.notes or 'None'}",
                timestamp=c.consultation_date,
                metadata={"vitals": c.vitals, "worker_id": c.worker_id},
            )
        )

    # 3. Prescriptions
    for p in patient.prescriptions:
        med_names = [item.medicine_name for item in p.items]
        events.append(
            TimelineEvent(
                id=f"rx-{p.id}",
                event_type="PRESCRIPTION",
                title=f"Prescription Issued by {p.prescriber_name}",
                description=f"Medications prescribed: {', '.join(med_names) if med_names else 'See attached Rx'}",
                timestamp=p.issue_date,
                metadata={"status": p.status},
            )
        )

    # 4. Lab Reports
    for lr in patient.lab_reports:
        events.append(
            TimelineEvent(
                id=f"lab-{lr.id}",
                event_type="LAB_REPORT",
                title=f"Lab Report: {lr.test_type}",
                description=lr.summary or f"{lr.title} processed",
                timestamp=lr.report_date,
                metadata={"test_type": lr.test_type},
            )
        )

    # 5. Vaccinations
    for v in patient.vaccinations:
        events.append(
            TimelineEvent(
                id=f"vax-{v.id}",
                event_type="VACCINATION",
                title=f"Vaccine: {v.vaccine_name} (Dose {v.dose_number})",
                description=f"Status: {v.status}. Administered by: {v.administered_by or 'Health Centre'}",
                timestamp=v.administered_date,
                metadata={"next_due": v.next_due_date},
            )
        )

    # 6. Field Visits
    for fv in patient.field_visits:
        events.append(
            TimelineEvent(
                id=f"fv-{fv.id}",
                event_type="FIELD_VISIT",
                title=f"Field Visit in {fv.village}",
                description=f"Symptoms noted: {fv.symptoms or 'Routine checkup'}. {fv.notes or ''}",
                timestamp=fv.visit_date,
                metadata={"follow_up": fv.follow_up_date},
            )
        )

    # Sort descending (most recent first)
    events.sort(key=lambda x: x.timestamp, reverse=True)
    return events
