
from sqlalchemy.orm import Session
from app.models.role import Role

DEFAULT_ROLES = ["user", "seller", "admin", "administrator"]

def seed_roles(db: Session):
    for role_name in DEFAULT_ROLES:
        existing = db.query(Role).filter(Role.role_name == role_name).first()
        if not existing:
            db.add(Role(role_name=role_name))
    db.commit()


from sqlalchemy.orm import Session
from app.models.payment_method import PaymentMethodMeta

DEFAULT_PAYMENT_METHODS = [
    {
        "method_code": "PROMPTPAY",
        "display_name": "PromptPay QR",
        "logo_url": "https://example.com/logos/promptpay.png",
        "fee_percent": 0.0,
        "is_active": True,
    },
    {
        "method_code": "BANK_TRANSFER",
        "display_name": "Bank Transfer",
        "logo_url": "https://example.com/logos/bank_transfer.png",
        "fee_percent": 0.0,
        "is_active": True,
    },
    {
        "method_code": "STRIPE_CARD",
        "display_name": "Credit/Debit Card (Stripe)",
        "logo_url": "https://example.com/logos/stripe.png",
        "fee_percent": 2.9,
        "is_active": True,
    },
]

def seed_payment_methods(db: Session):
    for method in DEFAULT_PAYMENT_METHODS:
        existing = db.query(PaymentMethodMeta).filter(
            PaymentMethodMeta.method_code == method["method_code"]
        ).first()
        if not existing:
            new_method = PaymentMethodMeta(**method)
            db.add(new_method)
    db.commit()
    print("✅ Payment methods seeded successfully.")
