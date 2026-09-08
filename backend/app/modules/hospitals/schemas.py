"""
Pydantic schemas for the Nearby Hospitals module.
"""
from typing import Optional, List
from pydantic import BaseModel


class HospitalInfo(BaseModel):
    """Normalized hospital/clinic information."""
    id: str
    name: str
    latitude: float
    longitude: float
    address: str
    distance_km: float
    phone: Optional[str] = None
    type: str = "hospital"           # hospital | clinic | pharmacy | doctor
    open_now: Optional[bool] = None
    amenity: Optional[str] = None    # hospital | clinic | doctors | pharmacy


class NearbyHospitalsResponse(BaseModel):
    hospitals: List[HospitalInfo]
    total: int
    latitude: float
    longitude: float
    radius_km: float
    provider: str = "OpenStreetMap (Overpass API)"
