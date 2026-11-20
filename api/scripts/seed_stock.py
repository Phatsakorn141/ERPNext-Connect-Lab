"""scripts/seed_stock.py — เปิดนับสต็อก + รับของเข้าคลัง ใน ERPNext

⚠️ สคริปต์นี้ "เขียนข้อมูลจริง" ลง ERPNext ที่ ERP_URL ชี้อยู่
รัน (ในโฟลเดอร์ TestERP Connect):
    docker compose exec api python -m scripts.seed_stock

ทำ 2 อย่าง:
1. Item: is_stock_item 0 → 1  (เปลี่ยนได้เฉพาะตอนยังไม่มีเอกสารที่ Submit แล้วอ้างถึงสินค้านั้น)
2. Stock Entry แบบ "Material Receipt" (รับของเข้าคลัง) แล้ว Submit
   → ERPNext สร้าง Stock Ledger + Bin ให้ (actual_qty เพิ่มขึ้น)

รันซ้ำได้: สินค้าที่มีของในคลังแล้วจะข้าม

หมายเหตุ: site นี้ติดตั้งแอป erpnext_thailand → ทุกการลงบัญชี (GL) ต้องมีแถวของบริษัท
ใน Thai Tax Settings ก่อน ไม่งั้นขึ้น "Please set up Thai Tax Settings for company ..."
"""

import asyncio

import erpnext
import stock
from config import settings
from scripts.seed_items import ITEMS

# จำนวนเริ่มต้น — ตั้งใจให้บางตัวเหลือน้อย / หมด เพื่อดูหน้าเว็บ
QTY = {
    "HP-001": 15, "WATCH-001": 8, "SHIRT-001": 30, "BAG-001": 12,
    "COFFEE-001": 3,   # เหลือน้อย → "Only 3 left"
    "LAMP-001": 20, "SERUM-001": 50, "YOGA-001": 25,
    "PUZZLE-001": 1,   # เหลือชิ้นเดียว
    "BOOK-001": 40,
    "PET-001": 0,      # ไม่รับเข้า → "Out of stock"
}
COST_RATIO = 0.6  # ต้นทุน = 60% ของราคาขาย (ERPNext ต้องรู้มูลค่าของที่รับเข้า)


async def main():
    print(f"ERPNext: {settings.erp_url}")
    wh = await stock.warehouse()
    company = (await erpnext.get_list("Warehouse", ["company"], [["name", "=", wh]], limit=1))[0]["company"]
    print(f"คลัง: {wh}  (บริษัท {company})")

    # 1) เปิดนับสต็อก
    for code, *_ in ITEMS:
        item = await erpnext.get_doc("Item", code)
        if item["is_stock_item"]:
            print(f"  = {code} นับสต็อกอยู่แล้ว")
        else:
            await erpnext.update_doc("Item", code, {"is_stock_item": 1})
            print(f"  + {code} เปิดนับสต็อก")

    # 2) รับของเข้า (เฉพาะตัวที่ยังไม่มีของ)
    have = await stock.available()
    rows = [
        {"item_code": code, "qty": QTY[code], "basic_rate": round(price * COST_RATIO), "t_warehouse": wh}
        for code, _name, _group, price, _desc in ITEMS
        if QTY.get(code, 0) > 0 and have.get(code, 0) == 0
    ]
    if not rows:
        print("ไม่มีอะไรต้องรับเข้า")
        return

    doc = await erpnext.create_doc("Stock Entry", {
        "stock_entry_type": "Material Receipt",
        "company": company,
        "to_warehouse": wh,
        "items": rows,
        "docstatus": 1,  # 1 = สร้างแล้ว Submit ทันที (0 = Draft)
    })
    print(f"  + {doc['name']} รับเข้า {len(rows)} รายการ (Submitted)")
    print("เสร็จแล้ว → POST /sync/products หรือรอ auto-sync")


if __name__ == "__main__":
    asyncio.run(main())
