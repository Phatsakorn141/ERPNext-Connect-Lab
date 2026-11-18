"""routes/local_customers.py — /customers: อ่านลูกค้าจาก MongoDB (ข้อมูลที่ sync มาจาก ERPNext)

เร็วกว่า /erp/customers และใช้ได้แม้ ERPNext ล่ม
แต่ข้อมูลใหม่เท่ากับการ sync ครั้งล่าสุด
"""

import re  # ใช้ re.escape กันอักขระพิเศษในคำค้น

from fastapi import APIRouter, HTTPException

from db import db

router = APIRouter(prefix="/customers", tags=["MongoDB: Customer"])


def _to_api(doc: dict) -> dict:
    """แปลง _id ของ MongoDB กลับเป็น name ให้เหมือน ERPNext

    {"_id": "P'pop", ...}  →  {"name": "P'pop", ...}
    หน้าเว็บจะได้ใช้ c.name เหมือนกันไม่ว่าข้อมูลมาจากไหน
    """
    doc["name"] = doc.pop("_id")
    return doc


@router.get("")
async def list_customers(search: str | None = None, limit: int = 50):
    """รายชื่อลูกค้า  ใส่ ?search=abc เพื่อค้นหาจากชื่อ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)"""
    query = {}  # {} = เอาทั้งหมด
    if search:
        # $regex = ค้นหาแบบมีคำนี้อยู่ในชื่อ,  $options "i" = ไม่สนตัวพิมพ์เล็ก/ใหญ่
        # re.escape: กันไม่ให้อักขระพิเศษอย่าง . * ( ในคำค้นกลายเป็น regex
        query["customer_name"] = {"$regex": re.escape(search), "$options": "i"}
    # sort 1 = เรียง ก→ฮ / A→Z,  to_list(limit) = เอาไม่เกิน limit รายการ
    docs = await db.customers.find(query).sort("customer_name", 1).to_list(limit)
    return [_to_api(d) for d in docs]


@router.get("/{name}")
async def get_customer(name: str):
    """ลูกค้า 1 รายจาก MongoDB"""
    doc = await db.customers.find_one({"_id": name})
    if not doc:  # ไม่เจอ → None
        raise HTTPException(404, f"ไม่พบลูกค้า {name} ใน MongoDB (ลอง sync ก่อน)")
    return _to_api(doc)
