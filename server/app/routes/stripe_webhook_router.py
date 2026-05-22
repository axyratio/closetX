# app/api/webhooks.py
from fastapi import APIRouter, Depends, Request, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.stripe_webhook_service import StripeWebhookService
from app.core.config import settings

from app.core.stripe_client import stripe


router = APIRouter(
    prefix="/api/v1/webhooks",
    tags=["Stripe Webhook"],
)


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

    if event["type"] == "checkout.session.completed":
        StripeWebhookService.handle_checkout_session_completed(db, event)

    return {"received": True}
