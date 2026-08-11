from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.dashboard_analytics import schemas, service

router = APIRouter()

@router.get("/summary", response_model=schemas.AnalyticsSummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    """Fetch aggregated analytics from the health worker portal records."""
    return service.get_analytics_summary(db)
