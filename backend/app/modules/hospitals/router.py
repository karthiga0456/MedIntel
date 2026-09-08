"""
API routes for the Nearby Hospitals module.
Uses OpenStreetMap Overpass API — no external API key required.
"""
from fastapi import APIRouter, HTTPException, Query
from app.modules.hospitals.schemas import NearbyHospitalsResponse
from app.modules.hospitals.service import hospitals_service

router = APIRouter()


@router.get("/nearby", response_model=NearbyHospitalsResponse)
def get_nearby_hospitals(
    latitude: float = Query(..., description="User latitude", ge=-90, le=90),
    longitude: float = Query(..., description="User longitude", ge=-180, le=180),
    radius: float = Query(5.0, description="Search radius in kilometres", ge=0.5, le=50.0),
):
    """
    Fetch real hospitals, clinics, and pharmacies near the given coordinates.

    Uses OpenStreetMap Overpass API (no key required).
    Results are sorted by distance from the user's location.
    Responses are cached for 5 minutes.
    """
    try:
        return hospitals_service.get_nearby(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching nearby hospitals."
        )


@router.get("/ping")
def ping():
    return {"module": "hospitals", "status": "ok"}
