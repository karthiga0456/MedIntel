import asyncio
import os
from app.config import settings
from app.core.ai_provider import ai_provider_service

def test_groq():
    messages = [
        {"role": "user", "content": "hi"}
    ]
    response = ai_provider_service.generate_response(messages)
    print("Response:", response)
    print("Provider:", ai_provider_service.get_last_provider())

if __name__ == "__main__":
    test_groq()
