from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth import schemas, service
from app.db.models import User
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_token_payload,
    require_roles,
    oauth2_scheme
)
from app.core.audit import log_audit_event
from app.core.responses import success_response

router = APIRouter()


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = service.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return current_user


@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    new_user = service.create_user(db, user)
    log_audit_event(
        db,
        user_id=new_user.id,
        action="USER_REGISTERED",
        resource="user",
        resource_id=new_user.id,
        result="SUCCESS",
        ip_address=request.client.host if request.client else None
    )
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Authenticate with username/email and password, receive access & refresh tokens."""
    user = service.authenticate_user(db, form_data.username, form_data.password)
    client_ip = request.client.host if request and request.client else None
    if not user:
        log_audit_event(
            db,
            user_id=None,
            action="LOGIN_FAILED",
            resource="auth",
            resource_id=form_data.username,
            result="FAILURE",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "user_id": user.id})
    refresh_token = create_refresh_token(data={"sub": user.email, "role": user.role, "user_id": user.id})

    log_audit_event(
        db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        resource="auth",
        resource_id=user.id,
        result="SUCCESS",
        ip_address=client_ip
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "role": user.role,
        "user_id": user.id
    }


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(request_data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    payload = decode_access_token(request_data.refresh_token)
    if not payload or payload.get("type") != "refresh" or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = service.get_user_by_email(db, email=payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")

    new_access_token = create_access_token(data={"sub": user.email, "role": user.role, "user_id": user.id})
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": request_data.refresh_token,
        "role": user.role,
        "user_id": user.id
    }


@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Retrieve profile of the currently logged-in user."""
    return current_user


@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_payload: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Admin-only: list all system users."""
    return service.list_users(db, skip=skip, limit=limit)


@router.post("/users/{user_id}/role", response_model=schemas.UserResponse)
def change_user_role(
    user_id: str,
    role_data: schemas.RoleUpdateRequest,
    current_payload: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Admin-only: update user role (admin or worker)."""
    user = service.update_user_role(db, user_id, role_data.role)
    log_audit_event(
        db,
        user_id=current_payload.get("user_id"),
        action="ROLE_CHANGED",
        resource="user",
        resource_id=user_id,
        result="SUCCESS"
    )
    return user
