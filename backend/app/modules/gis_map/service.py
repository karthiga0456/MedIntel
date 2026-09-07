from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import Patient, DiseaseCase, Vaccination
from app.modules.gis_map.schemas import (
    VillageGeoPoint,
    HealthFacility,
    OutbreakCluster,
    MapLayersResponse,
)

# Canonical reference coordinates for district public health mapping
VILLAGE_COORDS = {
    "Village A": {"lat": 11.0168, "lng": 76.9558, "pop": 4200},
    "Village B": {"lat": 11.0310, "lng": 76.9720, "pop": 3800},
    "Village C": {"lat": 10.9980, "lng": 76.9410, "pop": 2900},
    "Sector 4": {"lat": 11.0420, "lng": 76.9850, "pop": 5100},
    "East Ward": {"lat": 11.0110, "lng": 76.9950, "pop": 3400},
}

HEALTH_FACILITIES: List[Dict[str, Any]] = [
    {
        "id": "fac-01",
        "name": "Primary Health Centre (PHC) Central",
        "facility_type": "Primary Health Centre",
        "latitude": 11.0195,
        "longitude": 76.9620,
        "available_beds": 12,
        "emergency_contact": "0422-2244101",
    },
    {
        "id": "fac-02",
        "name": "Community Health Centre (CHC) North",
        "facility_type": "Community Health Centre",
        "latitude": 11.0380,
        "longitude": 76.9790,
        "available_beds": 35,
        "emergency_contact": "0422-2244102",
    },
    {
        "id": "fac-03",
        "name": "District Government Hospital & Trauma Ward",
        "facility_type": "District Hospital",
        "latitude": 11.0040,
        "longitude": 76.9510,
        "available_beds": 180,
        "emergency_contact": "0422-2244100",
    },
]


class GISMapService:
    def get_map_layers(self, db: Session) -> MapLayersResponse:
        # 1. Aggregate cases by village from DB
        case_records = db.query(
            DiseaseCase.village,
            DiseaseCase.disease,
            func.sum(DiseaseCase.case_count).label("cases")
        ).group_by(DiseaseCase.village, DiseaseCase.disease).all()

        village_totals = {}
        village_top_disease = {}
        for vil, dis, count in case_records:
            village_totals[vil] = village_totals.get(vil, 0) + (count or 0)
            if vil not in village_top_disease or count > village_top_disease[vil][1]:
                village_top_disease[vil] = (dis, count)

        # 2. Aggregate vaccination coverage by village from patients
        patients = db.query(Patient).all()
        village_patients = {}
        village_vaccinated = {}
        for p in patients:
            vil = p.village
            village_patients[vil] = village_patients.get(vil, 0) + 1
            if p.vaccination_status == "fully_vaccinated":
                village_vaccinated[vil] = village_vaccinated.get(vil, 0) + 1

        village_points: List[VillageGeoPoint] = []
        clusters: List[OutbreakCluster] = []

        for name, geo in VILLAGE_COORDS.items():
            tot_cases = village_totals.get(name, 0)
            top_dis = village_top_disease.get(name, ("dengue", 0))[0].title()
            p_total = village_patients.get(name, 0)
            p_vax = village_vaccinated.get(name, 0)
            vax_rate = round((p_vax / p_total * 100.0) if p_total > 0 else 78.5, 1)

            if tot_cases >= 8:
                risk = "OUTBREAK"
                # Add cluster circle
                clusters.append(
                    OutbreakCluster(
                        id=f"cluster-{name.lower().replace(' ', '-')}",
                        disease=top_dis,
                        center_lat=geo["lat"],
                        center_lng=geo["lng"],
                        radius_meters=1800,
                        case_count=tot_cases,
                        severity="HIGH",
                    )
                )
            elif tot_cases >= 4:
                risk = "MODERATE"
            else:
                risk = "LOW"

            village_points.append(
                VillageGeoPoint(
                    id=f"vil-{name.lower().replace(' ', '-')}",
                    name=name,
                    latitude=geo["lat"],
                    longitude=geo["lng"],
                    population=geo["pop"],
                    total_cases=tot_cases,
                    active_cases_7d=tot_cases,
                    vaccination_rate_percent=vax_rate,
                    risk_level=risk,
                    top_disease=top_dis,
                )
            )

        facility_models = [HealthFacility(**f) for f in HEALTH_FACILITIES]

        return MapLayersResponse(
            villages=village_points,
            facilities=facility_models,
            outbreak_clusters=clusters,
        )


gis_map_service = GISMapService()
