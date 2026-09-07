import re
import io
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
import pypdf
from PIL import Image
import pytesseract

from app.core.logging import get_logger
from app.db.models import Medicine, Prescription, PrescriptionItem, Patient
from app.modules.medicines.schemas import (
    MedicineCreate,
    PrescriptionCreate,
    PrescriptionResponse,
    PrescriptionValidationResult,
    InteractionWarning,
    AllergyWarning,
)

logger = get_logger(__name__)

# Standard Essential Medicines Dataset (WHO / National Essential Medicines List)
INITIAL_MEDICINES: List[Dict[str, Any]] = [
    {
        "generic_name": "Paracetamol",
        "brand_name": "Dolo 650 / Calpol",
        "category": "Analgesic & Antipyretic",
        "default_dosage": "500mg - 650mg",
        "standard_frequency": "Every 6-8 hours as needed (Max 3g/day)",
        "warnings": "Avoid overdose; severe liver toxicity risk. Use caution in chronic liver disease.",
        "interactions": ["Warfarin", "Isoniazid"],
    },
    {
        "generic_name": "Amoxicillin",
        "brand_name": "Novamox / Mox",
        "category": "Antibiotic (Beta-lactam)",
        "default_dosage": "250mg - 500mg",
        "standard_frequency": "Every 8 hours with food",
        "warnings": "Contraindicated in penicillin allergy. Complete entire prescribed course.",
        "interactions": ["Methotrexate", "Warfarin", "Allopurinol"],
    },
    {
        "generic_name": "Azithromycin",
        "brand_name": "Azee / Zithrox",
        "category": "Antibiotic (Macrolide)",
        "default_dosage": "500mg",
        "standard_frequency": "Once daily for 3 to 5 days",
        "warnings": "Use with caution in cardiac arrhythmia / QT prolongation.",
        "interactions": ["Warfarin", "Digoxin", "Antacids"],
    },
    {
        "generic_name": "Metformin",
        "brand_name": "Glycomet",
        "category": "Antidiabetic (Biguanide)",
        "default_dosage": "500mg",
        "standard_frequency": "Twice daily with meals",
        "warnings": "Risk of lactic acidosis; avoid in severe renal impairment (eGFR < 30).",
        "interactions": ["Iodinated Contrast", "Furosemide", "Alcohol"],
    },
    {
        "generic_name": "Amlodipine",
        "brand_name": "Norvasc / Amlong",
        "category": "Antihypertensive (Calcium Channel Blocker)",
        "default_dosage": "5mg",
        "standard_frequency": "Once daily morning",
        "warnings": "Monitor for peripheral edema and hypotension.",
        "interactions": ["Simvastatin", "Clarithromycin"],
    },
    {
        "generic_name": "Ibuprofen",
        "brand_name": "Brufen / Advil",
        "category": "NSAID",
        "default_dosage": "400mg",
        "standard_frequency": "Every 8 hours after food",
        "warnings": "Risk of GI ulceration and renal impairment. Contraindicated in active GI bleeding.",
        "interactions": ["Aspirin", "Warfarin", "ACE Inhibitors", "Lithium"],
    },
    {
        "generic_name": "Aspirin",
        "brand_name": "Ecosprin",
        "category": "Antiplatelet / NSAID",
        "default_dosage": "75mg - 150mg",
        "standard_frequency": "Once daily with food",
        "warnings": "Risk of bleeding. Contraindicated in children with viral infections (Reye syndrome).",
        "interactions": ["Ibuprofen", "Warfarin", "Heparin", "Methotrexate"],
    },
    {
        "generic_name": "Omeprazole",
        "brand_name": "Omez",
        "category": "Proton Pump Inhibitor (PPI)",
        "default_dosage": "20mg",
        "standard_frequency": "Once daily 30 minutes before breakfast",
        "warnings": "Prolonged use may decrease B12 and magnesium absorption.",
        "interactions": ["Clopidogrel", "Diazepam", "Ketoconazole"],
    },
    {
        "generic_name": "Cetirizine",
        "brand_name": "Cetzine / Zyrtec",
        "category": "Antihistamine",
        "default_dosage": "10mg",
        "standard_frequency": "Once daily at bedtime",
        "warnings": "May cause mild drowsiness. Avoid operating heavy machinery.",
        "interactions": ["Alcohol", "CNS Depressants"],
    },
    {
        "generic_name": "Oral Rehydration Salts (ORS)",
        "brand_name": "Electral / W.H.O. ORS",
        "category": "Electrolyte Replenisher",
        "default_dosage": "1 sachet in 1L clean water",
        "standard_frequency": "Drink freely after each loose stool",
        "warnings": "Use clean, boiled water. Discard unused solution after 24 hours.",
        "interactions": [],
    },
]

KNOWN_DRUG_INTERACTIONS = [
    {
        "drug_a": "ibuprofen",
        "drug_b": "aspirin",
        "severity": "SEVERE",
        "description": "Ibuprofen reduces the cardioprotective antiplatelet effect of low-dose aspirin and increases gastrointestinal bleeding risk.",
    },
    {
        "drug_a": "amoxicillin",
        "drug_b": "methotrexate",
        "severity": "SEVERE",
        "description": "Penicillin antibiotics decrease renal clearance of methotrexate, leading to potential toxicity.",
    },
    {
        "drug_a": "paracetamol",
        "drug_b": "warfarin",
        "severity": "MODERATE",
        "description": "High regular doses of paracetamol may enhance the anticoagulant effect of warfarin.",
    },
    {
        "drug_a": "ibuprofen",
        "drug_b": "warfarin",
        "severity": "CRITICAL",
        "description": "Concurrent use significantly elevates risk of life-threatening gastrointestinal hemorrhage.",
    },
    {
        "drug_a": "aspirin",
        "drug_b": "warfarin",
        "severity": "CRITICAL",
        "description": "Concurrent use significantly elevates risk of life-threatening gastrointestinal hemorrhage and major bleeding.",
    },
    {
        "drug_a": "metformin",
        "drug_b": "alcohol",
        "severity": "SEVERE",
        "description": "Alcohol potentiates metformin's effect on lactate metabolism, elevating lactic acidosis risk.",
    },
]

ALLERGY_CLASS_MAP = {
    "penicillin": ["amoxicillin", "ampicillin", "augmentin", "penicillin", "piperacillin"],
    "sulfa": ["bactrim", "cotrimoxazole", "sulfamethoxazole", "sulfasalazine"],
    "nsaid": ["ibuprofen", "aspirin", "naproxen", "diclofenac", "ketorolac"],
    "aspirin": ["aspirin", "ecosprin", "salicylate"],
    "macrolide": ["azithromycin", "clarithromycin", "erythromycin"],
}


class MedicineService:
    def seed_initial_medicines(self, db: Session) -> None:
        count = db.query(Medicine).count()
        if count == 0:
            for item in INITIAL_MEDICINES:
                med = Medicine(
                    generic_name=item["generic_name"],
                    brand_name=item["brand_name"],
                    category=item["category"],
                    default_dosage=item["default_dosage"],
                    standard_frequency=item["standard_frequency"],
                    warnings=item["warnings"],
                    interactions=item["interactions"],
                )
                db.add(med)
            db.commit()
            logger.info("Seeded %d essential medicines.", len(INITIAL_MEDICINES))

    def search_medicines(self, db: Session, query_str: str) -> List[Medicine]:
        pattern = f"%{query_str}%"
        return db.query(Medicine).filter(
            or_(
                Medicine.generic_name.ilike(pattern),
                Medicine.brand_name.ilike(pattern),
                Medicine.category.ilike(pattern),
            )
        ).all()

    def check_safety(self, db: Session, patient_id: str, medicine_names: List[str]) -> PrescriptionValidationResult:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        allergy_warnings: List[AllergyWarning] = []
        drug_interactions: List[InteractionWarning] = []

        # 1. Allergy Checking
        if patient and patient.allergies:
            patient_allergies = [a.strip().lower() for a in patient.allergies.split(",") if a.strip()]
            for med in medicine_names:
                med_lower = med.lower()
                for allergen in patient_allergies:
                    # Direct name match
                    if allergen in med_lower or med_lower in allergen:
                        allergy_warnings.append(
                            AllergyWarning(
                                severity="CRITICAL",
                                drug_name=med,
                                allergy_matched=allergen,
                                warning_message=f"Patient is documented allergic to '{allergen}'. Medication '{med}' should NOT be dispensed.",
                            )
                        )
                    # Class-based match
                    mapped_drugs = ALLERGY_CLASS_MAP.get(allergen, [])
                    for sub in mapped_drugs:
                        if sub in med_lower:
                            allergy_warnings.append(
                                AllergyWarning(
                                    severity="CRITICAL",
                                    drug_name=med,
                                    allergy_matched=f"{allergen} (Class: {sub})",
                                    warning_message=f"'{med}' belongs to the cross-reactive {allergen} class. Contraindicated.",
                                )
                            )

        # 2. Drug-Drug Interaction Checking
        meds_normalized = [m.lower() for m in medicine_names]
        for pair in KNOWN_DRUG_INTERACTIONS:
            da, db_name = pair["drug_a"], pair["drug_b"]
            has_a = any(da in m for m in meds_normalized)
            has_b = any(db_name in m for m in meds_normalized)
            if has_a and has_b:
                drug_interactions.append(
                    InteractionWarning(
                        severity=pair["severity"],
                        drug_a=pair["drug_a"].title(),
                        drug_b=pair["drug_b"].title(),
                        description=pair["description"],
                    )
                )

        has_warnings = len(allergy_warnings) > 0 or len(drug_interactions) > 0
        return PrescriptionValidationResult(
            has_warnings=has_warnings,
            allergy_warnings=allergy_warnings,
            drug_interactions=drug_interactions,
        )

    def create_prescription(self, db: Session, data: PrescriptionCreate) -> PrescriptionResponse:
        med_names = [item.medicine_name for item in data.items]
        validation = self.check_safety(db, data.patient_id, med_names)

        prescription = Prescription(
            patient_id=data.patient_id,
            consultation_id=data.consultation_id,
            prescriber_name=data.prescriber_name,
            issue_date=datetime.utcnow(),
            status="active",
            notes=data.notes,
        )
        db.add(prescription)
        db.commit()
        db.refresh(prescription)

        items_out = []
        for item in data.items:
            # Check if exists in catalog
            med_db = db.query(Medicine).filter(Medicine.generic_name.ilike(item.medicine_name)).first()
            p_item = PrescriptionItem(
                prescription_id=prescription.id,
                medicine_id=med_db.id if med_db else None,
                medicine_name=item.medicine_name,
                dosage=item.dosage,
                frequency=item.frequency,
                duration_days=item.duration_days,
                instructions=item.instructions,
            )
            db.add(p_item)
            items_out.append({
                "medicine_name": item.medicine_name,
                "dosage": item.dosage,
                "frequency": item.frequency,
                "duration_days": item.duration_days,
            })
        db.commit()

        return PrescriptionResponse(
            id=prescription.id,
            patient_id=prescription.patient_id,
            prescriber_name=prescription.prescriber_name,
            issue_date=prescription.issue_date,
            status=prescription.status,
            notes=prescription.notes,
            items=items_out,
            warnings=validation,
        )

    def parse_prescription_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        ext = filename.split(".")[-1].lower()
        text = ""
        if ext == "pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
            except Exception as e:
                logger.error(f"Error reading prescription PDF: {e}")
        elif ext in ["png", "jpg", "jpeg"]:
            try:
                img = Image.open(io.BytesIO(content))
                text = pytesseract.image_to_string(img)
            except Exception as e:
                logger.error(f"Error OCR on prescription image: {e}")

        # Extract medicines detected from text
        detected_meds = []
        for known in INITIAL_MEDICINES:
            if known["generic_name"].lower() in text.lower() or (known["brand_name"] and any(b.lower() in text.lower() for b in known["brand_name"].split("/"))):
                detected_meds.append({
                    "medicine_name": known["generic_name"],
                    "default_dosage": known["default_dosage"],
                    "standard_frequency": known["standard_frequency"],
                })

        return {
            "raw_text": text[:1000] if text else "No text extracted",
            "detected_medications": detected_meds,
        }


medicine_service = MedicineService()
