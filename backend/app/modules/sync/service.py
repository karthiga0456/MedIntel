from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.core.logging import get_logger
from app.db.models import (
    SyncRecord,
    HealthRecord,
    Patient,
    FieldVisit,
    Vaccination,
    DiseaseCase,
)
from app.modules.sync.schemas import BatchSyncRequest, BatchSyncResponse

logger = get_logger(__name__)


def process_batch_sync(db: Session, request: BatchSyncRequest) -> BatchSyncResponse:
    synced_uuids: List[str] = []
    errors: List[Dict[str, Any]] = []
    duplicates_count = 0
    synced_count = 0

    for item in request.items:
        # Check if already processed (Idempotency check)
        existing_sync = db.query(SyncRecord).filter(SyncRecord.client_uuid == item.client_uuid).first()
        if existing_sync:
            duplicates_count += 1
            synced_uuids.append(item.client_uuid)
            continue

        try:
            payload = item.payload
            entity = item.entity_type

            if entity == "health_record":
                record = HealthRecord(
                    patient_name=payload.get("patient_name", "Unknown"),
                    village=payload.get("village", "Unknown"),
                    age=payload.get("age"),
                    symptoms=payload.get("symptoms"),
                    vaccination_status=payload.get("vaccination_status"),
                    worker_id=payload.get("worker_id", request.worker_id or "offline-worker"),
                    synced=True,
                )
                db.add(record)

                # If symptoms indicate disease, log into disease_cases for surveillance
                symptoms_lower = (payload.get("symptoms") or "").lower()
                for d in ["dengue", "malaria", "cholera", "typhoid", "covid"]:
                    if d in symptoms_lower:
                        case = DiseaseCase(
                            disease=d,
                            village=payload.get("village", "Unknown"),
                            case_count=1,
                            severity="moderate",
                            notes=f"Auto-logged from offline worker record: {payload.get('patient_name')}",
                        )
                        db.add(case)

            elif entity == "patient":
                # Create patient if UHID or phone does not exist
                uhid = payload.get("uhid")
                existing_p = None
                if uhid:
                    existing_p = db.query(Patient).filter(Patient.uhid == uhid).first()
                if not existing_p:
                    from app.modules.patients.service import generate_uhid
                    new_p = Patient(
                        uhid=uhid or generate_uhid(db),
                        name=payload.get("name", "Unknown"),
                        age=payload.get("age"),
                        gender=payload.get("gender", "other"),
                        phone=payload.get("phone"),
                        village=payload.get("village", "Unknown"),
                        vaccination_status=payload.get("vaccination_status", "partially_vaccinated"),
                    )
                    db.add(new_p)

            elif entity == "field_visit":
                visit = FieldVisit(
                    worker_id=payload.get("worker_id", request.worker_id or "hw-default"),
                    patient_id=payload.get("patient_id"),
                    village=payload.get("village", "Unknown"),
                    symptoms=payload.get("symptoms"),
                    vaccination_administered=payload.get("vaccination_administered"),
                    notes=payload.get("notes"),
                    follow_up_date=payload.get("follow_up_date"),
                )
                db.add(visit)

            elif entity == "vaccination":
                vax = Vaccination(
                    patient_id=payload.get("patient_id"),
                    vaccine_name=payload.get("vaccine_name", "Routine Vaccine"),
                    dose_number=payload.get("dose_number", 1),
                    administered_date=datetime.utcnow(),
                    status="completed",
                    administered_by=request.worker_id or "ASHA Worker",
                )
                db.add(vax)

            # Record sync transaction
            sync_rec = SyncRecord(
                client_uuid=item.client_uuid,
                entity_type=entity,
                payload=payload,
                status="synced",
            )
            db.add(sync_rec)
            db.commit()

            synced_uuids.append(item.client_uuid)
            synced_count += 1

        except Exception as e:
            db.rollback()
            logger.error(f"Sync error for UUID {item.client_uuid}: {e}")
            errors.append({"client_uuid": item.client_uuid, "error": str(e)})

            # Record failed sync for debugging
            try:
                sync_fail = SyncRecord(
                    client_uuid=item.client_uuid,
                    entity_type=item.entity_type,
                    payload=item.payload,
                    status="error",
                    error_message=str(e),
                )
                db.add(sync_fail)
                db.commit()
            except Exception:
                db.rollback()

    return BatchSyncResponse(
        total_received=len(request.items),
        synced_count=synced_count,
        duplicates_ignored=duplicates_count,
        failed_count=len(errors),
        synced_uuids=synced_uuids,
        errors=errors,
    )
