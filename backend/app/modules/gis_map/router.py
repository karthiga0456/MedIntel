from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles
from app.modules.gis_map import schemas, service

router = APIRouter()


@router.get("/layers", response_model=schemas.MapLayersResponse)
def get_map_layers(
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """
    Retrieve GIS mapping layers:
    Villages, disease case densities, health facilities (PHC/CHC/Hospital),
    vaccination coverage percentages, and active outbreak clusters.
    """
    return service.gis_map_service.get_map_layers(db)


@router.get("/ping")
def ping():
    return {"module": "gis_map", "status": "ok"}
