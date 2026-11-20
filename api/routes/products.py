"""routes/products.py — API สำหรับหน้าร้าน: อ่านสินค้า/หมวดหมู่จาก MongoDB

ข้อมูลมาจาก POST /sync/products (Item + Item Price + Item Group ใน ERPNext)
หน้าร้านอ่านจาก MongoDB เท่านั้น → เร็ว และไม่ยิง ERPNext ทุกครั้งที่มีคนเปิดเว็บ
"""

import re

from fastapi import APIRouter, HTTPException

from db import db

router = APIRouter(tags=["Shop: Products"])

# สินค้าที่แสดงหน้าร้านได้: มีข้อมูล Item แล้ว (ไม่ใช่แค่ราคา) และไม่ถูกปิดใช้งาน
VISIBLE = {"item_name": {"$exists": True}, "disabled": {"$ne": True}}


def _to_api(doc: dict) -> dict:
    """_id (item_code ของ ERPNext) → code  และไม่ส่ง field ภายในออกไป"""
    doc["code"] = doc.pop("_id")
    doc.pop("synced_at", None)
    doc.pop("erp_modified", None)
    return doc


@router.get("/products")
async def list_products(category: str | None = None, search: str | None = None, limit: int = 24):
    """รายการสินค้า  ?category=Electronics  ?search=bag"""
    query = dict(VISIBLE)  # ก๊อปก่อน จะได้ไม่แก้ค่า VISIBLE ที่ใช้ร่วมกัน
    if category:
        query["item_group"] = category
    if search:
        # re.escape: กันอักขระพิเศษในคำค้นกลายเป็น regex,  "i" = ไม่สนตัวพิมพ์เล็ก/ใหญ่
        query["item_name"] = {"$regex": re.escape(search), "$options": "i"}
    docs = await db.products.find(query).sort("item_name", 1).to_list(limit)
    return [_to_api(d) for d in docs]


@router.get("/products/{code}")
async def get_product(code: str):
    """สินค้า 1 ชิ้น (สำหรับหน้ารายละเอียดสินค้า)"""
    doc = await db.products.find_one({"_id": code, **VISIBLE})
    if not doc:
        raise HTTPException(404, f"ไม่พบสินค้า {code}")
    return _to_api(doc)


@router.get("/categories")
async def list_categories():
    """หมวดหมู่ (เฉพาะหมวดล่างสุด ไม่เอาหมวดแม่) + จำนวนสินค้าในแต่ละหมวด"""
    # aggregate = ให้ MongoDB นับให้: จับกลุ่มสินค้าตาม item_group แล้วนับ
    counts = {
        row["_id"]: row["count"]
        async for row in await db.products.aggregate([
            {"$match": VISIBLE},
            {"$group": {"_id": "$item_group", "count": {"$sum": 1}}},
        ])
    }
    groups = await db.categories.find({"is_group": False}).sort("_id", 1).to_list(200)
    return [{"name": g["_id"], "parent": g["parent"], "count": counts.get(g["_id"], 0)} for g in groups]
