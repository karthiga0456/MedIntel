"""
Local/offline database session (SQLite by default) used mainly by the
Health Worker Portal module so that ASHA workers can log data without
internet connectivity, then sync later.
"""
import os
import pathlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

db_url = settings.local_db_url
if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
    db_url = "sqlite:////tmp/health_worker.db"
else:
    try:
        data_path = pathlib.Path("./data/local_db")
        data_path.mkdir(parents=True, exist_ok=True)
        # Test file creation to ensure directory is writable
        test_file = data_path / ".write_test"
        test_file.touch()
        test_file.unlink()
    except Exception:
        db_url = "sqlite:////tmp/health_worker.db"


engine = create_engine(
    db_url, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency that yields a DB session and closes it afterward."""
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
    """Create all tables and seed default admin and worker accounts if missing."""
    # Import all models here so metadata is registered before create_all
    import app.db.models  # noqa: F401
    
    Base.metadata.create_all(bind=engine)

    # Auto-seed default accounts on app startup
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

