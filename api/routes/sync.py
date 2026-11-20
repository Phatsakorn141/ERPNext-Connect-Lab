"""routes/sync.py — /sync: ดึงข้อมูลจาก ERPNext มาเก็บใน MongoDB

2 โหมด:
- incremental (ปกติ): ดึงเฉพาะรายการที่ "modified" ใหม่กว่ารอบที่แล้ว → เร็ว
- full (?full=true):   ดึงทั้งหมด + ลบรายการที่ถูกลบใน ERPNext ออกจาก MongoDB

ข้อมูลที่ sync (ERPNext DocType → MongoDB collection):
  Customer    → customers
  Item        → products     (สินค้า)
  Item Price  → products     (เติมราคาลงในสินค้าตัวเดียวกัน)
  Item Group  → categories   (หมวดหมู่)

sync_state = จำว่าแต่ละ DocType sync ถึง modified ไหนแล้ว  ({_id: "Customer", last_modified: ...})
"""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter
from pymongo import UpdateOne  # คำสั่ง update 1 รายการ (ใช้รวมกันใน bulk_write)

import erpnext
from config import settings
from db import db

# prefix = ทุก route ในไฟล์นี้ขึ้นต้นด้วย /sync
# tags   = ชื่อกลุ่มในหน้า /docs
router = APIRouter(prefix="/sync", tags=["Sync: ERPNext → MongoDB"])

PAGE_SIZE = 100  # ดึงทีละ 100 รายการ (ไม่ดึงทีเดียวหมื่นรายการ)

# กันไม่ให้ sync 2 รอบทำงานพร้อมกัน (เช่น auto-sync กับคนกดเอง)
# รอบที่มาทีหลังจะรอจนรอบแรกเสร็จ
_lock = asyncio.Lock()


# ==================== ตัว sync กลาง (ใช้ได้กับทุก DocType) ====================

async def _sync(doctype, fields, collection, to_doc, full,
                key_field="name", filters=None, delete_missing=True):
    """ดึง doctype จาก ERPNext ทีละหน้า แล้ว upsert ลง collection ใน MongoDB

    fields         = field ที่จะขอจาก ERPNext (ต้องมี key_field กับ "modified")
    collection     = collection ปลายทาง เช่น db.products
    to_doc(row)    = ฟังก์ชันแปลง 1 แถวจาก ERPNext → dict ที่จะ $set ลง MongoDB
    key_field      = field ที่ใช้เป็น _id (ปกติ "name", Item Price ใช้ "item_code")
    filters        = เงื่อนไขเพิ่ม เช่น [["price_list", "=", "Standard Selling"]]
    delete_missing = full sync แล้วลบรายการที่ไม่มีใน ERPNext ไหม
    """
    now = datetime.now(timezone.utc)  # เวลาที่ sync รอบนี้ (ใช้เหมือนกันทุกรายการ)

    # 1) ดูว่ารอบที่แล้ว sync ถึงไหน
    state = await db.sync_state.find_one({"_id": doctype})
    # full หรือยังไม่เคย sync → since = None → ดึงทั้งหมด
    since = None if full or not state else state["last_modified"]
    query = list(filters or [])
    if since:
        query.append(["modified", ">", since])  # ขอเฉพาะรายการที่แก้ไขหลังจากนั้น

    # 2) ดึงจาก ERPNext ทีละหน้า เรียงตาม modified เก่า → ใหม่
    #    (เรียงแบบนี้ → รายการสุดท้ายที่ได้ = modified ล่าสุด เอาไปจำไว้ได้เลย)
    synced, start, last_modified = 0, 0, since
    seen = []  # key ทุกตัวที่เจอ (ใช้ตอน full sync เพื่อหาว่าอะไรถูกลบ)
    while True:
        rows = await erpnext.get_list(
            doctype, fields, query or None,
            limit=PAGE_SIZE, start=start, order_by="modified asc",
        )

        # 3) upsert ลง MongoDB: มีอยู่แล้ว → อัปเดต, ยังไม่มี → เพิ่มใหม่
        ops = []
        for row in rows:
            key = row[key_field]
            last_modified = row["modified"]
            doc = to_doc(row) | {"synced_at": now}
            # $set = ตั้งค่า field เหล่านี้,  upsert=True = ถ้าไม่เจอให้สร้างใหม่
            ops.append(UpdateOne({"_id": key}, {"$set": doc}, upsert=True))
            seen.append(key)
        if ops:
            await collection.bulk_write(ops)  # ส่งทีเดียวทั้งหน้า (เร็วกว่ายิงทีละรายการ)

        synced += len(rows)
        if len(rows) < PAGE_SIZE:
            break  # ได้น้อยกว่า 1 หน้า = หน้าสุดท้ายแล้ว
        start += PAGE_SIZE  # ไปหน้าถัดไป

    # 4) โหมด full: ลบรายการที่ไม่มีใน ERPNext แล้ว ($nin = "not in")
    deleted = 0
    if full and delete_missing:
        result = await collection.delete_many({"_id": {"$nin": seen}})
        deleted = result.deleted_count

    # 5) จำไว้ว่ารอบนี้ sync ถึง modified ไหน (รอบหน้าเริ่มต่อจากตรงนี้)
    await db.sync_state.update_one(
        {"_id": doctype},
        {"$set": {"last_modified": last_modified, "synced_at": now}},
        upsert=True,
    )
    return {"since": since, "synced": synced, "deleted": deleted}


# ==================== Customer ====================

def _customer_doc(row):
    """แถว Customer จาก ERPNext → document ใน MongoDB (เก็บเฉพาะ field ที่ใช้จริง)"""
    return {
        "customer_name": row["customer_name"],
        "customer_type": row["customer_type"],
        "customer_group": row["customer_group"],
        "territory": row["territory"],
        "disabled": bool(row["disabled"]),  # ERPNext ใช้ 0/1 → แปลงเป็น True/False
        "erp_modified": row["modified"],
    }


@router.post("/customers")
async def sync_customers(full: bool = False):
    """sync ลูกค้า  (เรียกได้ทั้งจากคนกด POST และจาก auto-sync ใน main.py)"""
    async with _lock:
        result = await _sync(
            "Customer",
            ["name", "customer_name", "customer_type", "customer_group",
             "territory", "disabled", "modified"],
            db.customers, _customer_doc, full,
        )
    return {"mode": "full" if full else "incremental", **result}


# ==================== Item / Item Price / Item Group (สินค้า) ====================

def _image_url(path):
    """รูปใน ERPNext เก็บเป็น path เช่น "/files/a.jpg" → ต่อหน้าด้วย URL ของ ERPNext"""
    if not path:
        return None
    return path if path.startswith("http") else settings.erp_url + path


def _item_doc(row):
    """แถว Item → ข้อมูลสินค้า (ราคาเติมทีหลังจาก Item Price)"""
    return {
        "item_name": row["item_name"],
        "item_group": row["item_group"],
        "description": row["description"],
        "image": _image_url(row["image"]),
        "uom": row["stock_uom"],               # หน่วยนับ เช่น Nos, Kg
        "disabled": bool(row["disabled"]),
        "erp_modified": row["modified"],
    }


def _price_doc(row):
    """แถว Item Price → เติม field ราคาลงในสินค้าตัวเดียวกัน (_id = item_code)"""
    return {"price": row["price_list_rate"], "currency": row["currency"]}


def _group_doc(row):
    """แถว Item Group → หมวดหมู่"""
    return {"parent": row["parent_item_group"], "is_group": bool(row["is_group"])}


@router.post("/products")
async def sync_products(full: bool = False):
    """sync สินค้า: Item → ราคา → หมวดหมู่ (เรียงลำดับนี้เสมอ)"""
    async with _lock:
        items = await _sync(
            "Item",
            ["name", "item_name", "item_group", "description", "image",
             "stock_uom", "disabled", "modified"],
            db.products, _item_doc, full,
        )
        prices = await _sync(
            "Item Price",
            ["name", "item_code", "price_list_rate", "currency", "modified"],
            db.products, _price_doc, full,
            key_field="item_code",  # เติมลงสินค้าตาม item_code ไม่ใช่ name ของ Item Price
            filters=[["price_list", "=", settings.erp_price_list]],
            delete_missing=False,   # ห้ามลบสินค้าเพียงเพราะไม่มีราคา
        )
        # หมวดหมู่มีไม่กี่รายการ → full ทุกรอบ (ได้ลบหมวดที่ถูกลบไปด้วย)
        groups = await _sync(
            "Item Group",
            ["name", "parent_item_group", "is_group", "modified"],
            db.categories, _group_doc, full=True,
        )
    return {
        "mode": "full" if full else "incremental",
        "items": items, "prices": prices, "categories": groups,
    }


# ==================== สถานะ ====================

@router.get("/status")
async def sync_status():
    """ดูสถานะ sync ล่าสุดของทุก DocType + จำนวนข้อมูลใน MongoDB"""
    states = {s["_id"]: s async for s in db.sync_state.find()}
    customer = states.get("Customer", {})
    return {
        # 2 field นี้หน้า /customers ใช้อยู่ (คงไว้เหมือนเดิม)
        "last_modified": customer.get("last_modified"),
        "synced_at": customer.get("synced_at"),
        "customers_in_mongo": await db.customers.count_documents({}),
        "products_in_mongo": await db.products.count_documents({}),
        "categories_in_mongo": await db.categories.count_documents({}),
        # สถานะแยกตาม DocType
        "doctypes": {
            name: {"last_modified": s.get("last_modified"), "synced_at": s.get("synced_at")}
            for name, s in states.items()
        },
    }
