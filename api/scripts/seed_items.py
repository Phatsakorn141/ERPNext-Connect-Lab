"""scripts/seed_items.py — สร้างหมวดหมู่ + สินค้าตัวอย่าง + ราคา ใน ERPNext

⚠️ สคริปต์นี้ "เขียนข้อมูลจริง" ลง ERPNext ที่ ERP_URL ชี้อยู่
รัน (ในโฟลเดอร์ TestERP Connect):
    docker compose exec api python -m scripts.seed_items

รันซ้ำได้: รายการที่มีอยู่แล้วจะข้าม ไม่สร้างซ้ำ
"""

import asyncio

import erpnext
from config import settings

# หมวดหมู่ (Item Group) ให้ตรงกับไอคอนหน้าร้าน
GROUPS = ["Electronics", "Fashion", "Home & Living", "Beauty",
          "Sports", "Toys & Kids", "Books", "Pet Supplies"]

# (รหัสสินค้า, ชื่อ, หมวด, ราคาขาย THB, คำอธิบาย)
ITEMS = [
    ("HP-001", "Noise Cancelling Headphones", "Electronics", 2790, "Wireless over-ear headphones with 30-hour battery."),
    ("WATCH-001", "Smart Fitness Watch", "Electronics", 3490, "Heart rate, sleep tracking and 7-day battery."),
    ("SHIRT-001", "Linen Casual Shirt", "Fashion", 990, "Breathable linen shirt for everyday wear."),
    ("BAG-001", "Urban Travel Backpack", "Fashion", 1290, "Water-resistant backpack with laptop sleeve."),
    ("COFFEE-001", "Compact Coffee Maker", "Home & Living", 1890, "Brews 4 cups in under 5 minutes."),
    ("LAMP-001", "Ceramic Table Lamp", "Home & Living", 890, "Warm light ceramic lamp for bedside or desk."),
    ("SERUM-001", "Hydrating Face Serum", "Beauty", 590, "Lightweight serum with hyaluronic acid."),
    ("YOGA-001", "Non-slip Yoga Mat", "Sports", 690, "6 mm cushioned mat with carrying strap."),
    ("PUZZLE-001", "Wooden Puzzle Set", "Toys & Kids", 390, "Set of 4 wooden puzzles for ages 3+."),
    ("BOOK-001", "Everyday Habits", "Books", 350, "A practical guide to building small daily habits."),
    ("PET-001", "Cozy Pet Bed", "Pet Supplies", 1190, "Soft washable bed for cats and small dogs."),
]


async def exists(doctype, field, value):
    """มีรายการที่ field = value อยู่แล้วไหม"""
    rows = await erpnext.get_list(doctype, ["name"], [[field, "=", value]], limit=1)
    return bool(rows)


async def main():
    print(f"ERPNext: {settings.erp_url}")

    # 1) หมวดหมู่ (อยู่ใต้ "All Item Groups")
    for g in GROUPS:
        if await exists("Item Group", "name", g):
            print(f"  = หมวด {g} (มีแล้ว)")
            continue
        await erpnext.create_doc("Item Group", {
            "item_group_name": g,
            "parent_item_group": "All Item Groups",
            "is_group": 0,  # 0 = หมวดล่างสุด ใส่สินค้าได้
        })
        print(f"  + หมวด {g}")

    # 2) สินค้า + 3) ราคา
    for code, name, group, price, desc in ITEMS:
        if await exists("Item", "name", code):
            print(f"  = สินค้า {code} (มีแล้ว)")
        else:
            await erpnext.create_doc("Item", {
                "item_code": code,
                "item_name": name,
                "item_group": group,
                "description": desc,
                "stock_uom": "Nos",   # หน่วยนับ: ชิ้น
                "is_stock_item": 0,   # 0 = ไม่ตัดสต็อก (ไม่ต้องตั้งคลังสินค้า)
                "is_sales_item": 1,
            })
            print(f"  + สินค้า {code} {name}")

        # ราคา: 1 สินค้า มี 1 ราคาใน Price List ของหน้าร้าน
        price_rows = await erpnext.get_list(
            "Item Price", ["name"],
            [["item_code", "=", code], ["price_list", "=", settings.erp_price_list]], limit=1)
        if price_rows:
            print(f"    = ราคา {code} (มีแล้ว)")
        else:
            await erpnext.create_doc("Item Price", {
                "item_code": code,
                "price_list": settings.erp_price_list,
                "price_list_rate": price,
            })
            print(f"    + ราคา {code} = {price} THB")

    print("เสร็จแล้ว → POST /sync/products เพื่อดึงลง MongoDB")


if __name__ == "__main__":
    asyncio.run(main())
