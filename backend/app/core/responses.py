"""
Standardized API envelope format for MedIntel.

Success:
{
    "success": true,
    "data": ...
}

Error:
{
    "success": false,
    "error": {
        "code": "CODE_NAME",
        "message": "Human readable message"
    }
}
"""
from typing import Any, Optional
from fastapi.responses import JSONResponse


def success_response(data: Any = None, status_code: int = 200) -> dict:
    """Return standard success dictionary."""
    return {
        "success": True,
        "data": data
    }


def error_response(code: str, message: str, status_code: int = 400) -> JSONResponse:
    """Return standard JSONResponse for errors with proper status code."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message
            }
        }
    )
