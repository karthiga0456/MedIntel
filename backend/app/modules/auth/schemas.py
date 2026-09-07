from pydantic import BaseModel, EmailStr
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    role: Optional[str] = "worker"
    user_id: Optional[str] = None


class TokenData(BaseModel):
    email: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RoleUpdateRequest(BaseModel):
    role: str


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "worker"


class UserResponse(UserBase):
    id: str
    is_active: bool
    role: str

    model_config = {"from_attributes": True}
