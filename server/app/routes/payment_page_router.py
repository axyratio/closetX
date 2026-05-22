# # app/routes/payment_page_router.py
# from fastapi import APIRouter, Depends, Request
# from fastapi.responses import HTMLResponse
# from pathlib import Path
# from fastapi import APIRouter, Request, Query
# from fastapi.responses import HTMLResponse
# from fastapi.templating import Jinja2Templates
# from pathlib import Path
# from sqlalchemy.orm import Session
# from app.db.database import get_db
# from app.models.payment import Payment
# from app.models.order import Order

# router = APIRouter(prefix="/payment", tags=["Payment Pages"])

# templates = Jinja2Templates(directory=str(Path(__file__).parent.parent / "templates"))



# @router.get("/success", response_class=HTMLResponse)
# async def payment_success_page(
#     request: Request,
#     session_id: str | None = Query(default=None),
# ):
#     # session_id จะมาจาก /payment/success?session_id=cs_....
#     return templates.TemplateResponse(
#         "payment_success.html",
#         {"request": request, "session_id": session_id},
#     )

# @router.get("/timeout", response_class=HTMLResponse)
# async def payment_timeout_page(
#     request: Request,
#     order_id: str | None = Query(default=None),
# ):
#     """
#     หน้าแสดงผลเมื่อหมดเวลาชำระเงิน
#     """
#     return templates.TemplateResponse(
#         "payment_timeout.html",
#         {
#             "request": request,
#             "order_id": order_id or "N/A",
#             "back_url": "/"
#         },
#     )

# @router.get("/cancel", response_class=HTMLResponse)
# async def payment_cancel_page(request: Request):
#     """
#     หน้าแสดงผลเมื่อยกเลิกการชำระเงิน
#     """
#     html_content = """
#     <!DOCTYPE html>
#     <html lang="th">
#     <head>
#         <meta charset="UTF-8">
#         <meta name="viewport" content="width=device-width, initial-scale=1.0">
#         <title>ยกเลิกการชำระเงิน</title>
#         <script src="https://cdn.tailwindcss.com"></script>
#     </head>
#     <body class="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 min-h-screen flex items-center justify-center p-4">
#         <div class="max-w-md w-full">
#             <div class="bg-white rounded-3xl shadow-2xl p-8 text-center">
#                 <!-- Cancel Icon -->
#                 <div class="mx-auto w-24 h-24 mb-6">
#                     <svg class="w-full h-full text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
#                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
#                     </svg>
#                 </div>
                
#                 <h1 class="text-3xl font-bold text-gray-800 mb-2">
#                     ยกเลิกการชำระเงิน
#                 </h1>
                
#                 <p class="text-gray-600 mb-6">
#                     คุณได้ยกเลิกการชำระเงิน<br>
#                     สินค้าในตะกร้ายังคงอยู่
#                 </p>
                
#                 <div class="space-y-3">
#                     <button 
#                         onclick="window.location.href='/cart'"
#                         class="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
#                     >
#                         กลับไปที่ตะกร้า
#                     </button>
                    
#                     <button 
#                         onclick="window.location.href='/'"
#                         class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300"
#                     >
#                         กลับหน้าหลัก
#                     </button>
#                 </div>
#             </div>
#         </div>
#     </body>
#     </html>
#     """
#     return HTMLResponse(content=html_content)
