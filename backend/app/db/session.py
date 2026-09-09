"""
Local/offline database session (SQLite by default).
Automatically uses /tmp on Vercel (read-only except /tmp).
Always runs init_db() at request-time so serverless cold-starts have all tables.
"""
import os
import pathlib
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings


def _resolve_db_url() -> str:
    """Choose SQLite path that is writable in the current environment."""
    if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
        return "sqlite:////tmp/health_worker.db"
    try:
        data_path = pathlib.Path("./data/local_db")
        data_path.mkdir(parents=True, exist_ok=True)
        test_file = data_path / ".write_test"
        test_file.touch()
        test_file.unlink()
        return settings.local_db_url
    except Exception:
        return "sqlite:////tmp/health_worker.db"


db_url = _resolve_db_url()
engine = create_engine(db_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, creating all tables first."""
    try:
        init_db()
    except Exception as e:
        print(f"DB init warning: {e}")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables and seed default admin/worker accounts."""
    import app.db.models  # noqa: F401 — register all ORM models
    Base.metadata.create_all(bind=engine)
    try:
        from app.modules.auth.service import get_user_by_email, create_user
        from app.modules.auth.schemas import UserCreate
        db = SessionLocal()
        try:
            if not get_user_by_email(db, "admin@medintel.gov"):
                create_user(db, UserCreate(email="admin@medintel.gov", password="adminpassword", role="admin"))
            if not get_user_by_email(db, "worker@medintel.gov"):
                create_user(db, UserCreate(email="worker@medintel.gov", password="workerpassword", role="worker"))
        finally:
            db.close()
    except Exception as e:
        print(f"Auto-seed warning: {e}")

