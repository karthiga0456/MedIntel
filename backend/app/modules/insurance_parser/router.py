from fastapi import APIRouter, UploadFile, File
from app.modules.insurance_parser.schemas import InsuranceClaimResponse
from app.modules.insurance_parser.service import insurance_parser_service

router = APIRouter()

@router.post("/calculate", response_model=InsuranceClaimResponse)
async def calculate_claim(
    bill_file: UploadFile = File(...),
    policy_file: UploadFile = File(...)
):
    """Parse medical bill and policy PDFs to calculate coverage."""
    return await insurance_parser_service.parse_claim(bill_file, policy_file)
