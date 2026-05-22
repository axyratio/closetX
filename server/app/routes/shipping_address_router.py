# app/api/v1/address_shipping_router.py (สมมติชื่อไฟล์)
from fastapi import APIRouter, Depends
from app.schemas.shipping_address import (
    ShippingAddressCreate,
    ShippingAddressUpdate,
)
from app.services.shipping_address_service import (
    create_shipping_address_service,
    get_shipping_address_by_id_service,
    get_all_shipping_addresses_service,
    get_default_shipping_address_service,
    update_shipping_address_service,
    delete_shipping_address_service,
)
from app.utils.response_handler import success_response, error_response
from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.models.user import User

router = APIRouter(prefix="/shipping-address", tags=["Shipping Address"])


@router.post(
    "/",
    dependencies=[
        Depends(authenticate_token()),
        Depends(authorize_role(["user", "admin", "seller"])),
    ],
)
def create_shipping_address(
    data: ShippingAddressCreate,
    db=Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        addr = create_shipping_address_service(db, current_user.user_id, data)
        return success_response("Shipping address created successfully", addr)
    except Exception as e:
        return error_response(
            "Failed to create shipping address", {"error": str(e)}
        )


@router.get(
    "/{ship_addr_id}",
    dependencies=[Depends(authenticate_token())],
)
def get_shipping_address_by_id(ship_addr_id: str, db=Depends(get_db)):
    try:
        addr = get_shipping_address_by_id_service(db, ship_addr_id)
        return success_response(
            "Shipping address retrieved successfully", addr
        )
    except Exception as e:
        return error_response(
            "Failed to fetch shipping address", {"error": str(e)}
        )


@router.get(
    "/",
    dependencies=[Depends(authenticate_token())],
)
def get_all_shipping_addresses(
    db=Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        addrs = get_all_shipping_addresses_service(db, current_user.user_id)
        return success_response(
            "Shipping addresses retrieved successfully", addrs
        )
    except Exception as e:
        return error_response(
            "Failed to fetch addresses", {"error": str(e)}
        )


@router.get(
    "/default",
    dependencies=[Depends(authenticate_token())],
)
def get_default_shipping_address(
    db=Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        addr = get_default_shipping_address_service(db, current_user.user_id)
        return success_response(
          "Default shipping address retrieved successfully", addr
        )
    except Exception as e:
        return error_response(
            "Failed to fetch default address", {"error": str(e)}
        )


@router.put(
    "/{ship_addr_id}",
    dependencies=[Depends(authenticate_token())],
)
def update_shipping_address(
    ship_addr_id: str, data: ShippingAddressUpdate, db=Depends(get_db)
):
    try:
        addr = update_shipping_address_service(db, ship_addr_id, data)
        return success_response(
            "Shipping address updated successfully", addr
        )
    except Exception as e:
        return error_response(
            "Failed to update shipping address", {"error": str(e)}
        )


@router.delete(
    "/{ship_addr_id}",
    dependencies=[Depends(authenticate_token())],
)
def delete_shipping_address(ship_addr_id: str, db=Depends(get_db)):
    try:
        addr = delete_shipping_address_service(db, ship_addr_id)
        return success_response(
            "Shipping address deleted successfully", addr
        )
    except Exception as e:
        return error_response(
            "Failed to delete shipping address", {"error": str(e)}
        )
