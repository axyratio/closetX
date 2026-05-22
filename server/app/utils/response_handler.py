from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

def success_response(message: str, data=None, status_code: int = 200):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": jsonable_encoder(data)  # ✅ แปลง object เป็น JSON-friendly
        }
    )

def error_response(message: str, errors: dict | None = None, status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "errors": jsonable_encoder(errors or {})
        }
    )
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

def success_response(message: str, data=None, status_code: int = 200):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": jsonable_encoder(data)  # ✅ แปลง object เป็น JSON-friendly
        }
    )

def error_response(message: str, errors: dict | None = None, status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "errors": jsonable_encoder(errors or {})
        }
    )
