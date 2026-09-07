from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles
from app.modules.insurance_parser.schemas import InsuranceClaimResponse
from app.modules.insurance_parser.service import insurance_parser_service

router = APIRouter()


@router.post("/calculate", response_model=InsuranceClaimResponse)
async def calculate_claim(
    bill_file: UploadFile = File(...),
    policy_file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Parse hospital bill and insurance policy documents (PDF / Image).
    Extracts line items, applies deductible & co-pay rules, excludes non-medical items,
    and returns transparent claim coverage breakdown.
    """
    return await insurance_parser_service.parse_claim(
        bill_file=bill_file,
        policy_file=policy_file,
        patient_id=patient_id,
        db=db,
    )


@router.get("/claims/patient/{patient_id}")
def get_patient_claims(
    patient_id: str,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """Retrieve historical insurance claims for a patient."""
    from app.db.models import InsuranceClaim
    claims = db.query(InsuranceClaim).filter(InsuranceClaim.patient_id == patient_id).order_by(InsuranceClaim.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "patient_id": c.patient_id,
            "total_billed": c.total_billed,
            "covered_amount": c.covered_amount,
            "out_of_pocket": c.out_of_pocket,
            "deductible_applied": c.deductible_applied,
            "copay_applied": c.copay_applied,
            "notes": c.notes,
            "status": c.status,
            "created_at": c.created_at,
        }
        for c in claims
    ]
