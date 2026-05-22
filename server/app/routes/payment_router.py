


# from fastapi import APIRouter, Depends, Request
# from sqlalchemy.orm import Session
# from pydantic import BaseModel
# import uuid, stripe

# from app.db.database import get_db
# from app.core.authz import authenticate_token
# from app.core.config import settings
# from app.services.payment_service import (
#     service_checkout_create_order_and_intent,
#     service_handle_stripe_webhook,
#     service_confirm_delivery_and_transfer,
# )
# from app.utils.response_handler import success_response, error_response

# router = APIRouter(prefix="/payments", tags=["Payments"])

# class CheckoutBody(BaseModel):
#     user_id: uuid.UUID
#     shipping_addr_id: uuid.UUID
#     customer_email: str
#     items: list[dict]  # {variant_id, product_id, store_id, price, quantity}

# @router.post("/checkout", dependencies=[Depends(authenticate_token())])
# def checkout(body: CheckoutBody, db: Session = Depends(get_db)):
#     return service_checkout_create_order_and_intent(
#         db,
#         user_id=body.user_id,
#         items=body.items,
#         shipping_addr_id=body.shipping_addr_id,
#         customer_email=body.customer_email
#     )

# @router.post("/webhook")
# async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
#     payload = await request.body()
#     sig_header = request.headers.get("stripe-signature")
#     try:
#         event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
#     except ValueError:
#         return error_response("Invalid payload", status_code=400)
#     except stripe.error.SignatureVerificationError:
#         return error_response("Invalid signature", status_code=400)

#     return await service_handle_stripe_webhook(db, event)

# class ConfirmBody(BaseModel):
#     order_id: uuid.UUID
#     platform_fee_rate: float = 0.05  # 5% (ปรับตามธุรกิจ)

# @router.post("/confirm-received", dependencies=[Depends(authenticate_token())])
# def confirm_received(body: ConfirmBody, db: Session = Depends(get_db)):
#     return service_confirm_delivery_and_transfer(db, order_id=str(body.order_id), platform_fee_rate=body.platform_fee_rate)
