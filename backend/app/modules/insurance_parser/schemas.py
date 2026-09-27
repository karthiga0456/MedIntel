from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class BillLineItem(BaseModel):
    category: str
    description: str
    amount: float
    is_covered: bool
    coverage_reason: str


class InsuranceClaimResponse(BaseModel):
    status: str
    totalBilled: float
    coveredAmount: float
    outOfPocket: float
    deductibleApplied: float
    coPayApplied: float
    nonCoveredAmount: float = 0.0
    notes: str
    disclaimer: str = (
        "⚠️ ESTIMATE ONLY: This claim assessment is an AI-assisted estimate based on extracted policy terms "
        "and bill line-items. It does not guarantee claim approval or specific payment amounts from any insurer."
    )
    lineItems: List[Dict[str, Any]] = []
