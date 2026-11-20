"""stock.py — สต็อกสินค้าจาก ERPNext

ERPNext เก็บจำนวนคงเหลือไว้ใน DocType "Bin" = 1 แถวต่อ (สินค้า, คลัง)
  actual_qty   = ของที่มีอยู่จริงในคลัง
  reserved_qty = ถูกจองไว้แล้วโดย Sales Order ที่ Submit แล้ว (ยังไม่ได้ส่งของ)
  → ขายได้อีก = actual_qty - reserved_qty

ใช้ 2 ที่:
  routes/sync.py   → sync ลง MongoDB ให้หน้าร้านแสดง "เหลือ N ชิ้น" (อาจช้าไม่เกิน SYNC_INTERVAL)
  routes/orders.py → เช็กสดกับ ERPNext ตอนสั่งซื้อ (ข้อมูลสำคัญต้องถามตัวจริง)
"""

from fastapi import HTTPException

import erpnext
from config import settings

_warehouse: str | None = None  # จำไว้หลังหาเจอครั้งแรก (ไม่ต้องถาม ERPNext ทุกครั้ง)


async def warehouse() -> str:
    """คลังที่หน้าร้านขายของออก: ERP_WAREHOUSE หรือคลังแรกที่ชื่อขึ้นต้นด้วย "Stores - " """
    global _warehouse
    if settings.erp_warehouse:
        return settings.erp_warehouse
    if _warehouse is None:
        rows = await erpnext.get_list(
            "Warehouse", ["name"], [["name", "like", "Stores - %"], ["is_group", "=", 0]], limit=1)
        if not rows:
            raise HTTPException(500, "ERPNext ไม่มีคลัง Stores — ตั้ง ERP_WAREHOUSE")
        _warehouse = rows[0]["name"]
    return _warehouse


async def available(codes: list[str] | None = None) -> dict[str, float]:
    """จำนวนที่ขายได้ของแต่ละสินค้าในคลังหน้าร้าน  {item_code: qty}

    codes = None → ทุกสินค้า,  ไม่มีแถว Bin = ยังไม่เคยมีของ (ไม่อยู่ใน dict)
    """
    filters = [["warehouse", "=", await warehouse()]]
    if codes is not None:
        if not codes:
            return {}
        filters.append(["item_code", "in", codes])

    result, start = {}, 0
    while True:
        rows = await erpnext.get_list(
            "Bin", ["item_code", "actual_qty", "reserved_qty"], filters, limit=500, start=start)
        for r in rows:
            result[r["item_code"]] = max(0, r["actual_qty"] - r["reserved_qty"])  # ไม่ให้ติดลบ
        if len(rows) < 500:
            return result
        start += 500
