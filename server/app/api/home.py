from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional

from app.db.database import get_db
from app.models.product import ImageType, Product, ProductImage, ProductVariant
from app.models.category import Category
from app.models.store import Store
from app.models.user import User
from app.utils.response_handler import success_response, error_response
from app.core.authz import get_current_user_from_cookie

router = APIRouter(prefix="/home", tags=["Home"])


def get_lowest_variant_price(db: Session, product_id) -> float:
    """Issue #8: ดึงราคาต่ำสุดจาก variants ของสินค้า"""
    result = db.query(func.min(ProductVariant.price)).filter(
        ProductVariant.product_id == product_id,
        ProductVariant.is_active == True,
    ).scalar()
    return float(result) if result is not None else 0.0



def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """
    พยายามดึง current user แต่ไม่ raise exception ถ้าไม่มี
    ใช้สำหรับ endpoint ที่ไม่จำเป็นต้อง login แต่ต้องการรู้ว่า user คือใคร (ถ้ามี)
    """
    try:
        return get_current_user_from_cookie(request, db)
    except:
        return None

@router.get("/products")
def get_home_products(
    skip: int = Query(0),
    limit: int = Query(10),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        current_user_store_id = None
        if current_user:
            user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
            if user_store:
                current_user_store_id = user_store.store_id

        product_query = (
            db.query(Product, ProductImage, Store)
            .join(Store, Product.store_id == Store.store_id)
            .join(                                                    # เพิ่ม
                ProductVariant,
                and_(
                    ProductVariant.product_id == Product.product_id,
                    ProductVariant.is_active == True,
                    ProductVariant.stock > 0,
                )
            )
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,
                    ProductImage.is_main == True,
                    ProductImage.image_type == ImageType.NORMAL
                ),
            )
            .filter(
                Product.is_active == True,
                Product.is_draft == False,
                Store.is_active == True,
                # ลบ ProductVariant.stock และ ProductVariant.is_active ออกจากตรงนี้
            )
            .group_by(Product.product_id, ProductImage.image_id, Store.store_id)
        )

        if current_user_store_id:
            product_query = product_query.filter(Product.store_id != current_user_store_id)

        product_rows = (
            product_query
            .order_by(Product.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        products = []
        for p, img, store in product_rows:
            products.append({
                "id": str(p.product_id),
                "title": p.product_name,
                "price": get_lowest_variant_price(db, p.product_id),
                "rating": p.average_rating or 0,
                "imageUrl": img.image_url if img else None,
                "imageId": str(img.image_id) if img else None,
                "storeName": store.name if store else None,
            })

        return success_response("Products retrieved successfully", {"products": products})

    except Exception as e:
        return error_response("Failed to fetch products", {"error": str(e)}, 500)
    
@router.get("")
def get_home_data(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    try:
        banners = [
            {
                "id": "banner-001",
                "title": "Virtual Try-On",
                "subtitle": "ลองเสื้อผ้าออนไลน์ก่อนตัดสินใจซื้อ",
                "buttonLabel": "ลองเลย!",
                "imageUrl": "/static/images/banners/vton_banner.png",
                "route": "/(tabs)/vton",
            },
        ]

        category_rows = (
            db.query(Category)
            .filter(Category.is_active == True)
            .order_by(Category.name)
            .all()
        )
        
        categories = []
        for cat in category_rows:
            categories.append({
                "id": str(cat.category_id),
                "name": cat.name,
                "slug": cat.slug,
                "iconUrl": cat.image if cat.image else None,
            })

        return success_response(
            "Home data retrieved successfully",
            {
                "banners": banners,
                "categories": categories,
                # ✅ ลบ products ออก
            }
        )

    except Exception as e:
        print(f"❌ Error in get_home_data: {e}")
        return error_response("Failed to fetch home data", {"error": str(e)}, 500)
    
#  สำหรับดึงหน้าหมวดหมู่ทั้งหมด (Categories Page) category page
@router.get("/categories-page")
def get_category_page_data(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    API สำหรับดึงข้อมูลทั้งหมดที่ต้องใช้ในหน้า Categories
    - Categories: หมวดหมู่สินค้า (จาก Database)
    - Products: สินค้าทั้งหมดพร้อม categoryId (ดึงจาก DB)
    
    🔒 กฎการแสดงสินค้า:
    1. ✅ แสดงเฉพาะสินค้าที่ is_active = True และ is_draft = False
    2. ✅ แสดงเฉพาะสินค้าจากร้านที่ is_active = True (ร้านที่เปิดอยู่)
    3. ✅ ไม่แสดงสินค้าของตัวเอง (ถ้า login อยู่)
    """
    try:
        # 1. Categories (ดึงจาก Database)
        category_rows = (
            db.query(Category)
            .filter(Category.is_active == True)
            .order_by(Category.name)
            .all()
        )
        
        categories = []
        for cat in category_rows:
            categories.append({
                "id": str(cat.category_id),
                "name": cat.name,
                "slug": cat.slug,
                "iconUrl": cat.image if cat.image else None,
            })

        # 2. ดึง store_id ของตัวเอง (ถ้า login อยู่)
        current_user_store_id = None
        if current_user:
            user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
            if user_store:
                current_user_store_id = user_store.store_id
                print(f"🛍️ Current user store_id: {current_user_store_id}")

        # 3. Products (ดึงสินค้าทั้งหมดที่ active)
        product_query = (
            db.query(Product, ProductImage, Store)
            .join(Store, Product.store_id == Store.store_id)
            .join(                                                    # เพิ่ม
                ProductVariant,
                and_(
                    ProductVariant.product_id == Product.product_id,
                    ProductVariant.is_active == True,
                    ProductVariant.stock > 0,
                )
            )
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,
                    ProductImage.is_main == True,
                    ProductImage.image_type == ImageType.NORMAL
                ),
            )
            .filter(
                Product.is_active == True,
                Product.is_draft == False,
                Store.is_active == True,
                # ลบ ProductVariant.stock และ ProductVariant.is_active ออกจากตรงนี้
            )
            .group_by(Product.product_id, ProductImage.image_id, Store.store_id)
        )

        # ✅ กรองสินค้าของตัวเองออก (ถ้า login อยู่)
        if current_user_store_id:
            product_query = product_query.filter(Product.store_id != current_user_store_id)
            print(f"🚫 Filtering out products from store: {current_user_store_id}")

        product_rows = (
            product_query
            .order_by(Product.created_at.desc())
            .all()
        )

        products = []
        for p, img, store in product_rows:
            products.append(
                {
                    "id": str(p.product_id),
                    "title": p.product_name,
                    "price": get_lowest_variant_price(db, p.product_id),  # Issue #8
                    "rating": p.average_rating or 0,
                    "imageUrl": img.image_url if img else None,
                    "imageId": str(img.image_id) if img else None,
                    # ใช้ category_id (UUID) เป็น key
                    "categoryId": str(p.category_id) if p.category_id else None,
                    "storeName": store.name if store else None,  # เพิ่มชื่อร้านด้วย
                }
            )

        data = {"categories": categories, "products": products}
        return success_response(
            "Category page data retrieved successfully", data
        )

    except Exception as e:
        print(f"❌ Error in get_category_page_data: {e}")
        return error_response(
            "Failed to fetch category page data", {"error": str(e)}, 500
        )