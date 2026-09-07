from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class SyncQueueItem(BaseModel):
    client_uuid: str
    entity_type: str  # 'health_record', 'patient', 'field_visit', 'vaccination'
    payload: Dict[str, Any]
    timestamp: Optional[str] = None


class BatchSyncRequest(BaseModel):
    worker_id: Optional[str] = None
    items: List[SyncQueueItem]


class BatchSyncResponse(BaseModel):
    total_received: int
    synced_count: int
    duplicates_ignored: int
    failed_count: int
    synced_uuids: List[str]
    errors: List[Dict[str, Any]] = []
