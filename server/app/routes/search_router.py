# app/routes/search_router.py
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.store import Store
from app.services.search_service import SearchService
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/home", tags=["Home"])


def _get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """ดึง current user แบบ optional (ไม่ต้อง login ก็ใช้ได้)"""
    try:
        from app.core.authz import get_current_user_from_cookie
        return get_current_user_from_cookie(request, db)
    except:
        return None


@router.get("/search")
def search_products(
    request: Request,
    query: Optional[str] = Query(None, description="คำค้นหา"),
    limit: int = Query(20, ge=1, le=100, description="จำนวนต่อหน้า"),
    offset: int = Query(0, ge=0, description="เริ่มจากตำแหน่ง"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """
    ค้นหาสินค้า — ค้นหาเฉพาะชื่อสินค้า

    - ค้นหาด้วยชื่อสินค้า: ?query=เสื้อ
    - Infinite scroll: ?limit=20&offset=0 → offset=20 → offset=40 ...
    """
    try:
        # หา store_id ของ user (กรองสินค้าตัวเองออก)
        exclude_store_id = None
        if current_user:
            user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
            if user_store:
                exclude_store_id = user_store.store_id

        result = SearchService.search_products(
            db=db,
            query=query,
            limit=limit,
            offset=offset,
            exclude_store_id=exclude_store_id,
        )

        return success_response("ค้นหาสำเร็จ", result)

    except Exception as e:
        print(f"❌ Error in search_products: {e}")
        return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)