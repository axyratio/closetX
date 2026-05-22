from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from .response_handler import error_response


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    จัดการ Pydantic validation errors เพื่อให้ response format ตรงกับที่ frontend คาดหวัง
    โดยใช้ error_response helper
    """
    errors = {}
    for error in exc.errors():
        # `loc` คือ path ไปยัง field ที่ error, เช่น ('body', 'phone_number')
        field = error["loc"][-1] if len(error["loc"]) > 1 else "general"

        # เก็บ error message แรกที่เจอสำหรับ field นั้นๆ
        if field not in errors:
            errors[field] = error["msg"]

    # เรียกใช้ error_response เพื่อสร้าง JSONResponse ใน format ที่ต้องการ
    return error_response(message="ข้อมูลไม่ถูกต้อง", errors=errors, status_code=status.HTTP_400_BAD_REQUEST)