from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_roles
from app.modules.sync import schemas, service

router = APIRouter()


@router.post("/batch", response_model=schemas.BatchSyncResponse)
def batch_sync(
    request: schemas.BatchSyncRequest,
    token_payload: dict = Depends(require_roles(["admin", "worker"])),
    db: Session = Depends(get_db),
):
    """
    Push batched offline records from IndexedDB to central server.
    Ensures idempotency using client_uuid.
    """
    return service.process_batch_sync(db, request)
