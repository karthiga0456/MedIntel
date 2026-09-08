"""
Comprehensive SQLAlchemy 2.x ORM models for MedIntel Public Health Ecosystem.
Includes all 19 domain models with relational integrity, foreign keys, and indexes.
"""
from datetime import datetime
import uuid
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Index
)
from sqlalchemy.orm import Mapped, relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


# ── 1. USER & AUTHENTICATION ───────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email: Mapped[str] = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = Column(String(255), nullable=False)
    role: Mapped[str] = Column(String(50), default="worker", nullable=False)  # 'admin', 'worker'
    is_active: Mapped[bool] = Column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    worker_profile = relationship("HealthWorker", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class HealthWorker(Base):
    __tablename__ = "health_workers"

    id: Mapped[str] = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id: Mapped[Optional[str]] = Column(String(36), ForeignKey("users.id"), unique=True, nullable=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = Column(String(50), nullable=True)
    employee_code: Mapped[Optional[str]] = Column(String(50), unique=True, index=True, nullable=True)
    assigned_villages: Mapped[Optional[str]] = Column(String(500), nullable=True)  # Comma-separated or JSON string
    active: Mapped[bool] = Column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="worker_profile")
    visits = relationship("FieldVisit", back_populates="worker")
    consultations = relationship("Consultation", back_populates="worker")


# ── 2. PATIENT MANAGEMENT ─────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    uhid: Mapped[str] = Column(String(64), unique=True, index=True, nullable=False)  # Unique Health Identifier
    name: Mapped[str] = Column(String(255), nullable=False, index=True)
    age: Mapped[Optional[int]] = Column(Integer, nullable=True)
    dob: Mapped[Optional[str]] = Column(String(50), nullable=True)
    gender: Mapped[Optional[str]] = Column(String(20), nullable=True)
    phone: Mapped[Optional[str]] = Column(String(50), index=True, nullable=True)
    address: Mapped[Optional[str]] = Column(Text, nullable=True)
    village: Mapped[str] = Column(String(255), index=True, nullable=False)
    emergency_contact: Mapped[Optional[str]] = Column(String(100), nullable=True)
    blood_group: Mapped[Optional[str]] = Column(String(10), nullable=True)
    allergies: Mapped[Optional[str]] = Column(Text, nullable=True)
    chronic_conditions: Mapped[Optional[str]] = Column(Text, nullable=True)
    vaccination_status: Mapped[str] = Column(String(50), default="partially_vaccinated", nullable=False)
    is_archived: Mapped[bool] = Column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    medical_history = relationship("PatientMedicalHistory", back_populates="patient", cascade="all, delete-orphan")
    consultations = relationship("Consultation", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    lab_reports = relationship("LabReport", back_populates="patient", cascade="all, delete-orphan")
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    medical_documents = relationship("MedicalDocument", back_populates="patient", cascade="all, delete-orphan")
    vaccinations = relationship("Vaccination", back_populates="patient", cascade="all, delete-orphan")
    field_visits = relationship("FieldVisit", back_populates="patient", cascade="all, delete-orphan")
    insurance_claims = relationship("InsuranceClaim", back_populates="patient", cascade="all, delete-orphan")
    disease_cases = relationship("DiseaseCase", back_populates="patient")


class PatientMedicalHistory(Base):
    __tablename__ = "patient_medical_history"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=False)
    condition = Column(String(255), nullable=False)
    diagnosed_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="medical_history")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=False)
    worker_id = Column(String(36), ForeignKey("health_workers.id"), nullable=True)
    consultation_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    chief_complaint = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=True)
    vitals = Column(JSON, nullable=True)  # {"bp": "120/80", "pulse": 72, "temp": 98.6, "spo2": 98}
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="consultations")
    worker = relationship("HealthWorker", back_populates="consultations")
    prescriptions = relationship("Prescription", back_populates="consultation")


# ── 3. MEDICINES & PRESCRIPTIONS ──────────────────────────────────────────────

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    generic_name = Column(String(255), index=True, nullable=False)
    brand_name = Column(String(255), index=True, nullable=True)
    category = Column(String(100), nullable=True)  # Antibiotic, Analgesic, Antipyretic, etc.
    default_dosage = Column(String(100), nullable=True)
    standard_frequency = Column(String(100), nullable=True)
    interactions = Column(JSON, nullable=True)  # List of drug names that interact
    warnings = Column(Text, nullable=True)
    indications = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    prescription_items = relationship("PrescriptionItem", back_populates="medicine")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    consultation_id = Column(String(36), ForeignKey("consultations.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=False)
    prescriber_name = Column(String(255), nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    raw_ocr_text = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # active, completed, discontinued
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="prescriptions")
    consultation = relationship("Consultation", back_populates="prescriptions")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    prescription_id = Column(String(36), ForeignKey("prescriptions.id"), index=True, nullable=False)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=True)
    medicine_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)  # e.g., '500mg'
    frequency = Column(String(100), nullable=False)  # e.g., 'Once daily after food'
    duration_days = Column(Integer, nullable=True)
    instructions = Column(Text, nullable=True)

    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine", back_populates="prescription_items")


# ── 4. LAB REPORTS & RESULTS ──────────────────────────────────────────────────

class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    test_type = Column(String(100), nullable=False)  # CBC, HbA1c, Lipid, LFT, KFT, Thyroid, Urine
    report_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    file_path = Column(String(500), nullable=True)
    ocr_extracted_text = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="lab_reports")
    results = relationship("LabResult", back_populates="report", cascade="all, delete-orphan")


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    lab_report_id = Column(String(36), ForeignKey("lab_reports.id"), index=True, nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=False)
    test_name = Column(String(100), nullable=False)  # Hemoglobin, WBC, Platelets, Fasting Glucose, etc.
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)  # g/dL, mg/dL, /mcL, etc.
    reference_range = Column(String(100), nullable=True)  # e.g. "12.0 - 16.0"
    status = Column(String(20), nullable=False)  # LOW, NORMAL, HIGH, CRITICAL
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("LabReport", back_populates="results")
    patient = relationship("Patient", back_populates="lab_results")


# ── 5. MEDICAL DOCUMENTS & RAG ────────────────────────────────────────────────

class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)  # prescription, lab_report, discharge_summary
    file_path = Column(String(500), nullable=True)
    extracted_text = Column(Text, nullable=True)
    indexed_chunks = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="medical_documents")


# ── 6. OUTBREAK & SURVEILLANCE ────────────────────────────────────────────────

class DiseaseCase(Base):
    __tablename__ = "disease_cases"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    disease = Column(String(100), index=True, nullable=False)  # dengue, malaria, cholera, etc.
    village = Column(String(255), index=True, nullable=False)
    reported_date = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    case_count = Column(Integer, default=1, nullable=False)
    severity = Column(String(50), default="moderate")  # mild, moderate, severe, critical
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="disease_cases")


class OutbreakPrediction(Base):
    __tablename__ = "outbreak_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    region = Column(String(255), index=True, nullable=False)
    disease = Column(String(100), index=True, nullable=False)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(50), nullable=False)  # low, moderate, high, severe
    predicted_7d_cases = Column(Float, nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    trend = Column(String(50), default="stable")  # rising, falling, stable
    model_type = Column(String(100), default="LSTM + XGBoost", nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── 7. HEALTH WORKER FIELD OPERATIONS & VACCINATIONS ──────────────────────────

class FieldVisit(Base):
    __tablename__ = "field_visits"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    worker_id = Column(String(36), ForeignKey("health_workers.id"), index=True, nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=True)
    village = Column(String(255), index=True, nullable=False)
    visit_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    symptoms = Column(Text, nullable=True)
    vaccination_administered = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    follow_up_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    worker = relationship("HealthWorker", back_populates="visits")
    patient = relationship("Patient", back_populates="field_visits")


class Vaccination(Base):
    __tablename__ = "vaccinations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=False)
    vaccine_name = Column(String(100), nullable=False)  # BCG, Polio, DPT, MMR, COVID-19
    dose_number = Column(Integer, default=1, nullable=False)
    administered_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    next_due_date = Column(String(50), nullable=True)
    status = Column(String(50), default="completed")  # completed, scheduled, missed
    administered_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="vaccinations")


# ── 8. INSURANCE INTELLIGENCE ─────────────────────────────────────────────────

class InsuranceClaim(Base):
    __tablename__ = "insurance_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), index=True, nullable=True)
    bill_file_path = Column(String(500), nullable=True)
    policy_file_path = Column(String(500), nullable=True)
    total_billed = Column(Float, default=0.0, nullable=False)
    covered_amount = Column(Float, default=0.0, nullable=False)
    out_of_pocket = Column(Float, default=0.0, nullable=False)
    deductible_applied = Column(Float, default=0.0, nullable=False)
    copay_applied = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="processed")  # processed, under_review, error
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="insurance_claims")


# ── 9. EMERGENCY & NOTIFICATIONS ──────────────────────────────────────────────

class EmergencyCase(Base):
    __tablename__ = "emergency_cases"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    patient_name = Column(String(255), nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True)
    symptoms = Column(Text, nullable=False)
    severity = Column(String(20), default="HIGH")  # CRITICAL, HIGH, MEDIUM
    location = Column(String(255), nullable=False)
    assigned_worker_id = Column(String(36), ForeignKey("health_workers.id"), nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, DISPATCHED, RESOLVED, ESCALATED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="SYSTEM")  # EMERGENCY, OUTBREAK, REMINDER, SYSTEM
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


# ── 10. AUDIT & SYNC RECORDS ──────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    action = Column(String(100), index=True, nullable=False)  # PATIENT_CREATED, LOGIN, etc.
    resource = Column(String(100), nullable=False)  # patient, lab_report, etc.
    resource_id = Column(String(100), nullable=True)
    result = Column(String(50), default="SUCCESS")  # SUCCESS, FAILURE
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    user = relationship("User", back_populates="audit_logs")


class SyncRecord(Base):
    __tablename__ = "sync_records"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    client_uuid = Column(String(64), unique=True, index=True, nullable=False)
    entity_type = Column(String(50), nullable=False)  # health_record, patient, visit
    payload = Column(JSON, nullable=False)
    status = Column(String(50), default="synced")  # synced, conflict, error
    error_message = Column(Text, nullable=True)
    synced_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── 11. BACKWARD-COMPATIBILITY: HEALTH RECORD ──────────────────────────────────

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, nullable=False)
    village = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    symptoms = Column(String, nullable=True)
    vaccination_status = Column(String, nullable=True)
    worker_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=False)
