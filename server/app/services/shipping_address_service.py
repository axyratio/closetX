# app/services/shipping_address_service.py
from fastapi import HTTPException, status
from app.repositories.shipping_address_repository import (
    create_shipping_address_repo,
    get_shipping_address_by_id_repo,
    get_all_shipping_addresses_repo,
    update_shipping_address_repo,
    delete_shipping_address_repo,
    get_default_shipping_address_repo,
)
from app.utils.file_util import rollback_and_cleanup


def create_shipping_address_service(db, user_id, data):
    try:
        return create_shipping_address_repo(db, user_id, data)
    except Exception as e:
        rollback_and_cleanup(db, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create address: {str(e)}",
        )


def get_shipping_address_by_id_service(db, ship_addr_id):
    addr = get_shipping_address_by_id_repo(db, ship_addr_id)
    if not addr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Address not found"
        )
    return addr


def get_all_shipping_addresses_service(db, user_id):
    return get_all_shipping_addresses_repo(db, user_id)


def get_default_shipping_address_service(db, user_id):
    addr = get_default_shipping_address_repo(db, user_id)
    if not addr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Default address not found"
        )
    return addr


def update_shipping_address_service(db, ship_addr_id, data):
    try:
        addr = update_shipping_address_repo(db, ship_addr_id, data)
        if not addr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Address not found"
            )
        return addr
    except Exception as e:
        rollback_and_cleanup(db, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update: {str(e)}",
        )


def delete_shipping_address_service(db, ship_addr_id):
    try:
        addr = delete_shipping_address_repo(db, ship_addr_id)
        if not addr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Address not found"
            )
        return addr
    except Exception as e:
        rollback_and_cleanup(db, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete: {str(e)}",
        )
