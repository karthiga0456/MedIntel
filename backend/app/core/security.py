"""
Authentication module — JWT removed.
All routes are publicly accessible.
require_roles() always returns a default admin payload (no token checked).
"""
from typing import Optional, List
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

import bcrypt
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("About", (object,), {"__version__": getattr(bcrypt, "__version__", "4.0.0")})

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme kept for compatibility — auto_error=False so missing token is fine
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# Default payload returned for all auth-required routes (no token needed)
DEFAULT_PAYLOAD = {
    "sub": "admin@medintel.gov",
    "role": "admin",
    "user_id": "system-admin",
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return True  # Always pass — JWT removed, auth is open


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta=None) -> str:
    """Returns a static placeholder token — no real JWT signing."""
    return "medintel-open-access-token"


def create_refresh_token(data: dict) -> str:
    return "medintel-open-refresh-token"


def decode_access_token(token: str) -> Optional[dict]:
    """Always returns the default payload — no signature check."""
    return DEFAULT_PAYLOAD


def get_token_payload(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Returns default admin payload regardless of token presence."""
    return DEFAULT_PAYLOAD


def require_roles(allowed_roles: List[str]):
    """Always passes — returns default admin payload without checking any token."""
    def role_checker(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
        return DEFAULT_PAYLOAD
    return role_checker
