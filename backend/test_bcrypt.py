import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import get_password_hash, verify_password

try:
    hash = get_password_hash("testpassword")
    print(f"Hash: {hash}")
    valid = verify_password("testpassword", hash)
    print(f"Valid: {valid}")
except Exception as e:
    print(f"Error: {e}")
