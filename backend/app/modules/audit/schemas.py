from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    result: str
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
