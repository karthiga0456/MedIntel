from pydantic import BaseModel

class InsuranceClaimResponse(BaseModel):
    status: str
    totalBilled: int
    coveredAmount: int
    outOfPocket: int
    deductibleApplied: int
    coPayApplied: int
    notes: str
