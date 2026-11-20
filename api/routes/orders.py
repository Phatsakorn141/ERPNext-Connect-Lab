"""routes/orders.py — สั่งซื้อจากหน้าร้าน → สร้าง Sales Order ใน ERPNext

POST /orders          ตะกร้า + ข้อมูลลูกค้า → Customer + Address + Sales Order (ERPNext)
                      แล้วเก็บสรุปคำสั่งซื้อไว้ใน MongoDB
GET  /orders/{token}  หน้ายืนยันคำสั่งซื้อ (อ่านจาก MongoDB)

หลักความปลอดภัย 2 ข้อ:
1. ไม่เชื่อราคาจาก browser  → ราคาคิดใหม่จาก MongoDB (ที่ sync มาจาก ERPNext) เสมอ
2. ไม่ใช้เลขที่ order ใน URL → เลข SAL-ORD-2026-00001 เดาง่าย ใครก็ไล่ดูข้อมูลคนอื่นได้
                               ใช้ token สุ่มยาวๆ แทน
"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

import erpnext
from auth import optional_user
from config import settings
from db import db
from routes.products import VISIBLE

router = APIRouter(tags=["Shop: Orders"])

BANGKOK = timezone(timedelta(hours=7))  # วันที่ในใบสั่งขายใช้เวลาไทย
DELIVERY_DAYS = 3                       # กำหนดส่งของ = วันนี้ + 3 วัน


# ==================== ข้อมูลที่หน้าเว็บส่งมา (Pydantic ตรวจให้) ====================

class CustomerInfo(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    email: EmailStr                                   # ตรวจรูปแบบอีเมลให้เอง
    phone: str = Field(min_length=6, max_length=20)
    address: str = Field(min_length=5, max_length=200)
    city: str = Field(min_length=2, max_length=80)


class OrderItem(BaseModel):
    code: str = Field(min_length=1, max_length=140)   # item_code
    qty: int = Field(ge=1, le=99)                     # 1–99 ชิ้น


class OrderIn(BaseModel):
    customer: CustomerInfo
    items: list[OrderItem] = Field(min_length=1, max_length=50)


# ==================== ขั้นตอนย่อย ====================

async def _find_or_create_customer(name: str) -> str:
    """หาลูกค้าจากชื่อ ไม่เจอ → สร้างใหม่  (คืน name ของ Customer ใน ERPNext)

    หมายเหตุ: จับคู่ด้วยชื่ออย่างเดียว → คนชื่อซ้ำจะได้ลูกค้าคนเดียวกัน (พอสำหรับการเรียน)
    """
    found = await erpnext.get_list("Customer", ["name"], [["customer_name", "=", name]], limit=1)
    if found:
        return found[0]["name"]
    doc = await erpnext.create_doc("Customer", {"customer_name": name, "customer_type": "Individual"})
    return doc["name"]


async def _create_address(customer: str, info: CustomerInfo) -> str:
    """สร้างที่อยู่จัดส่ง ผูกกับลูกค้า (links = Address นี้เป็นของ Customer ไหน)"""
    doc = await erpnext.create_doc("Address", {
        "address_title": info.name,
        "address_type": "Shipping",
        "address_line1": info.address,
        "city": info.city,
        "country": "Thailand",
        "email_id": info.email,
        "phone": info.phone,
        "links": [{"link_doctype": "Customer", "link_name": customer}],
    })
    return doc["name"]


async def _company() -> str:
    """บริษัทที่ขาย (ERPNext ต้องรู้ว่าใบสั่งขายเป็นของบริษัทไหน)"""
    rows = await erpnext.get_list("Company", ["name"], limit=1)
    if not rows:
        raise HTTPException(500, "ERPNext ยังไม่มี Company")
    return rows[0]["name"]


# ==================== POST /orders ====================

@router.post("/orders", status_code=201)
async def create_order(order: OrderIn, user: dict | None = Depends(optional_user)):
    """สั่งซื้อได้ทั้งแบบ login (ใช้ Customer ของบัญชี) และไม่ login (guest)"""
    # 1) รวมรายการที่ซ้ำ (สินค้าเดียวกัน 2 แถว → แถวเดียว qty รวมกัน)
    qty_by_code: dict[str, int] = {}
    for item in order.items:
        qty_by_code[item.code] = qty_by_code.get(item.code, 0) + item.qty

    # 2) ราคาจาก MongoDB เท่านั้น (ไม่ใช้ราคาที่ browser ส่งมา — แก้ใน browser ได้)
    #    $in = _id อยู่ในรายการนี้
    products = {
        p["_id"]: p
        async for p in db.products.find({"_id": {"$in": list(qty_by_code)}, **VISIBLE})
    }
    unavailable = [c for c in qty_by_code if products.get(c, {}).get("price") is None]
    if unavailable:
        raise HTTPException(400, f"สินค้าไม่พร้อมขาย: {', '.join(unavailable)}")

    # 3) ลูกค้า + ที่อยู่ ใน ERPNext
    #    login อยู่ → ใช้ Customer ที่ผูกกับบัญชี (แม่นกว่าหาจากชื่อ)
    #    guest      → หาจากชื่อ ไม่เจอค่อยสร้าง
    customer = user["customer"] if user else await _find_or_create_customer(order.customer.name)
    address = await _create_address(customer, order.customer)

    # 4) ใบสั่งขาย (Sales Order) — สร้างเป็น Draft ให้พนักงานตรวจแล้วกด Submit ใน ERPNext
    today = datetime.now(BANGKOK).date()
    delivery = today + timedelta(days=DELIVERY_DAYS)
    so = await erpnext.create_doc("Sales Order", {
        "customer": customer,
        "company": await _company(),
        "transaction_date": today.isoformat(),
        "delivery_date": delivery.isoformat(),
        "selling_price_list": settings.erp_price_list,
        "customer_address": address,
        "shipping_address_name": address,
        # items = ตารางย่อย (child table) ของ Sales Order
        "items": [
            {
                "item_code": code,
                "qty": qty,
                "rate": products[code]["price"],
                "delivery_date": delivery.isoformat(),
            }
            for code, qty in qty_by_code.items()
        ],
    })

    # 5) เก็บสรุปไว้ใน MongoDB (หน้ายืนยันอ่านจากที่นี่ ไม่ต้องยิง ERPNext)
    #    ยอดเงินใช้ค่าที่ ERPNext คำนวณ (grand_total) = ตัวจริง
    token = secrets.token_urlsafe(16)  # สุ่ม ~22 ตัวอักษร เดาไม่ได้
    await db.orders.insert_one({
        "_id": token,
        "order_no": so["name"],
        "user_id": user["_id"] if user else None,  # ใช้ดึงประวัติในหน้า /account
        "status": "Draft",
        "customer": customer,
        "customer_name": order.customer.name,
        "email": order.customer.email,
        "items": [
            {"code": i["item_code"], "item_name": i["item_name"], "qty": i["qty"],
             "rate": i["rate"], "amount": i["amount"]}
            for i in so["items"]
        ],
        "grand_total": so["grand_total"],
        "currency": so["currency"],
        "delivery_date": so["delivery_date"],
        "created_at": datetime.now(timezone.utc),
    })

    return {"token": token, "order_no": so["name"], "grand_total": so["grand_total"], "currency": so["currency"]}


# ==================== GET /orders/{token} ====================

@router.get("/orders/{token}")
async def get_order(token: str):
    """สรุปคำสั่งซื้อ (ไม่ส่งอีเมลออกไป — หน้ายืนยันไม่ต้องใช้)"""
    doc = await db.orders.find_one({"_id": token}, {"email": 0})  # {"email": 0} = ไม่เอา field นี้
    if not doc:
        raise HTTPException(404, "ไม่พบคำสั่งซื้อ")
    doc.pop("_id")
    return doc
