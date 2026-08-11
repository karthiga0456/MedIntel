import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, init_db
from app.modules.auth.schemas import UserCreate
from app.modules.auth.service import create_user, get_user_by_email

# Initialize the DB and tables
init_db()

db = SessionLocal()
try:
    existing = get_user_by_email(db, "admin@medintel.gov")
    if not existing:
        admin_user = UserCreate(email="admin@medintel.gov", password="adminpassword", role="admin")
        create_user(db, admin_user)
        print("Admin user created successfully: admin@medintel.gov / adminpassword")
    else:
        print("Admin user already exists.")
finally:
    db.close()
