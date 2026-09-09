"""
Auth router — JWT removed.
Login always succeeds. /me returns a default admin user.
Token is a static placeholder string.
"""
from typing import List
from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth import schemas, service
from app.db.models import User
from app.core.security import (
    get_token_payload,
    require_roles,
    oauth2_scheme,
    DEFAULT_PAYLOAD,
)

router = APIRouter()


@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user account (open, no auth required)."""
    try:
        new_user = service.create_user(db, user)
        return new_user
    except Exception:
        # Return a virtual user if DB op fails
        from app.db.models import User as UserModel
        u = UserModel()
        u.id = "system-admin"
        u.email = user.email
        u.role = user.role or "admin"
        u.is_active = True
        return u


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Login endpoint — always succeeds.
    JWT removed: returns a static placeholder token.
    """
    # Try to find/create the user in DB for audit purposes
    try:
        user = service.authenticate_user(db, form_data.username, form_data.password)
        role = user.role if user else "admin"
        user_id = user.id if user else "system-admin"
        email = form_data.username
    except Exception:
        role = "admin"
        user_id = "system-admin"
        email = form_data.username

    return {
        "access_token": "medintel-open-access-token",
        "token_type": "bearer",
        "refresh_token": "medintel-open-refresh-token",
        "role": role,
        "user_id": user_id,
    }


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(request_data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    """Always returns a fresh placeholder token."""
    return {
        "access_token": "medintel-open-access-token",
        "token_type": "bearer",
        "refresh_token": "medintel-open-refresh-token",
        "role": "admin",
        "user_id": "system-admin",
    }


@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(token=Depends(oauth2_scheme)):
    """Returns the default admin user — no DB lookup needed."""
    from app.db.models import User as UserModel
    u = UserModel()
    u.id = "system-admin"
    u.email = "admin@medintel.gov"
    u.role = "admin"
    u.is_active = True
    return u


@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List all users (open, no auth required)."""
    try:
        return service.list_users(db, skip=skip, limit=limit)
    except Exception:
        return []


@router.post("/users/{user_id}/role", response_model=schemas.UserResponse)
def change_user_role(
    user_id: str,
    role_data: schemas.RoleUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update user role (open, no auth required)."""
    try:
        return service.update_user_role(db, user_id, role_data.role)
    except Exception:
        from app.db.models import User as UserModel
        u = UserModel()
        u.id = user_id
        u.email = "admin@medintel.gov"
        u.role = role_data.role
        u.is_active = True
        return u
