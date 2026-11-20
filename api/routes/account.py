"""routes/account.py — ข้อมูลของผู้ใช้ที่ login อยู่

GET /account/orders   ประวัติการสั่งซื้อ (MongoDB) + สถานะล่าสุดจาก ERPNext
"""

from fastapi import APIRouter, Depends, HTTPException

import erpnext
from auth import require_user
from db import db

router = APIRouter(prefix="/account", tags=["Account"])


@router.get("/orders")
async def my_orders(user: dict = Depends(require_user)):
    orders = await db.orders.find({"user_id": user["_id"]}, {"email": 0}).sort("created_at", -1).to_list(50)

    # สถานะใน MongoDB = ตอนสั่ง (Draft) เสมอ → ถาม ERPNext ว่าตอนนี้เป็นอะไรแล้ว
    # ถามทีเดียวทุกใบด้วย filter "in" (ไม่ยิงทีละใบ)
    live = {}
    names = [o["order_no"] for o in orders]
    if names:
        try:
            rows = await erpnext.get_list("Sales Order", ["name", "status"], [["name", "in", names]], limit=len(names))
            live = {r["name"]: r["status"] for r in rows}
        except HTTPException:
            pass  # ERPNext ใช้ไม่ได้ → ใช้สถานะที่เก็บไว้ใน MongoDB ไปก่อน

    return [
        {
            "token": o["_id"],  # ใช้เปิดหน้า /order/<token>
            "order_no": o["order_no"],
            "status": live.get(o["order_no"], o["status"]),
            "payment_status": (o.get("payment") or {}).get("status", "unpaid"),  # จ่ายออนไลน์แล้วหรือยัง
            "grand_total": o["grand_total"],
            "currency": o["currency"],
            "items_count": sum(i["qty"] for i in o["items"]),
            "created_at": o["created_at"],
        }
        for o in orders
    ]
