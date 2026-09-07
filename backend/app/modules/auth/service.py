from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import User, HealthWorker
from app.modules.auth.schemas import UserCreate
from app.core.security import get_password_hash, verify_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user: UserCreate) -> User:
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        role=user.role or "worker"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # If registered as a health worker, auto-create associated worker profile
    if db_user.role == "worker":
        worker = HealthWorker(
            user_id=db_user.id,
            name=user.email.split("@")[0].capitalize(),
            employee_code=f"HW-{db_user.id[:6].upper()}",
            assigned_villages="Village A, Village B",
            active=True
        )
        db.add(worker)
        db.commit()

    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not user.is_active:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def list_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()


def update_user_role(db: Session, user_id: str, new_role: str) -> User:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if new_role not in ["admin", "worker"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'worker'")
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user
