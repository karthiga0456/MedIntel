import httpx

# We will start the FastAPI app in a background thread or just use test client
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.main import app

client = TestClient(app)

print("Testing Login...")
response = client.post("/api/v1/auth/login", data={"username": "admin@medintel.gov", "password": "adminpassword"})
print("Login status:", response.status_code)
print("Login body:", response.text)

if response.status_code == 200:
    token = response.json()["access_token"]
    print("\nTesting /me...")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    print("/me status:", me_resp.status_code)
    print("/me body:", me_resp.text)
