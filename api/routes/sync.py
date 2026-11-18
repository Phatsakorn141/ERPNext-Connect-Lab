"""routes/sync.py — /sync: ดึงข้อมูลจาก ERPNext มาเก็บใน MongoDB

2 โหมด:
- incremental (ปกติ): ดึงเฉพาะรายการที่ "modified" ใหม่กว่ารอบที่แล้ว → เร็ว
- full (?full=true):   ดึงทั้งหมด + ลบรายการที่ถูกลบใน ERPNext ออกจาก MongoDB

ใน MongoDB ใช้ 2 collection:
- customers   = ลูกค้าที่ sync มา  (_id = name ของ ERPNext)
- sync_state  = จำว่า sync ถึง modified ไหนแล้ว  ({_id: "Customer", last_modified: ...})
"""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter
from pymongo import UpdateOne  # คำสั่ง update 1 รายการ (ใช้รวมกันใน bulk_write)

import erpnext
from db import db

# prefix = ทุก route ในไฟล์นี้ขึ้นต้นด้วย /sync
# tags   = ชื่อกลุ่มในหน้า /docs
router = APIRouter(prefix="/sync", tags=["Sync: ERPNext → MongoDB"])

# เก็บเฉพาะ field ที่ใช้จริง (ไม่เก็บทั้งก้อน → ประหยัดที่ + ไม่เก็บข้อมูลส่วนตัวเกินจำเป็น)
CUSTOMER_FIELDS = [
    "name", "customer_name", "customer_type",
    "customer_group", "territory", "disabled", "modified",
]
PAGE_SIZE = 100  # ดึงทีละ 100 รายการ (ไม่ดึงทีเดียวหมื่นรายการ)


# กันไม่ให้ sync 2 รอบทำงานพร้อมกัน (เช่น auto-sync กับคนกดเอง)
# รอบที่มาทีหลังจะรอจนรอบแรกเสร็จ
_lock = asyncio.Lock()


@router.post("/customers")
async def sync_customers(full: bool = False):
    """เรียกได้ทั้งจากคนกด (POST) และจาก auto-sync ใน main.py

    full=False → incremental,  full=True (?full=true) → full sync
    """
    async with _lock:
        return await _sync_customers(full)


async def _sync_customers(full: bool):
    """ตัวทำงานจริงของ sync (เรียกผ่าน sync_customers เท่านั้น เพื่อให้ผ่าน lock)"""
    now = datetime.now(timezone.utc)  # เวลาที่ sync รอบนี้ (ใช้เหมือนกันทุกรายการ)

    # 1) ดูว่ารอบที่แล้ว sync ถึงไหน (เก็บไว้ใน collection "sync_state")
    state = await db.sync_state.find_one({"_id": "Customer"})
    # full หรือยังไม่เคย sync → since = None → ดึงทั้งหมด
    since = None if full or not state else state["last_modified"]
    # มี since → ขอเฉพาะรายการที่แก้ไขหลังจากนั้น
    filters = [["modified", ">", since]] if since else None

    # 2) ดึงจาก ERPNext ทีละหน้า เรียงตาม modified เก่า → ใหม่
    #    (เรียงแบบนี้ → รายการสุดท้ายที่ได้ = modified ล่าสุด เอาไปจำไว้ได้เลย)
    synced, start, last_modified = 0, 0, since
    seen_names = []  # เก็บชื่อทุกรายการที่เจอ (ใช้ตอน full sync เพื่อหาว่าอะไรถูกลบ)
    while True:
        rows = await erpnext.get_list(
            "Customer", CUSTOMER_FIELDS, filters,
            limit=PAGE_SIZE, start=start, order_by="modified asc",
        )

        # 3) upsert ลง MongoDB: มีอยู่แล้ว → อัปเดต, ยังไม่มี → เพิ่มใหม่
        ops = []
        for row in rows:
            name = row.pop("name")              # เอา name ออกมาใช้เป็น _id
            last_modified = row.pop("modified") # จำ modified ล่าสุดไว้
            doc = {
                **row,                              # field ที่เหลือทั้งหมด
                "disabled": bool(row["disabled"]),  # ERPNext ใช้ 0/1 → แปลงเป็น True/False
                "erp_modified": last_modified,      # เวลาแก้ไขใน ERPNext
                "synced_at": now,                   # เวลาที่ sync มา
            }
            # ใช้ name ของ ERPNext เป็น _id ใน MongoDB → ไม่มีวันซ้ำ
            # $set = ตั้งค่า field เหล่านี้,  upsert=True = ถ้าไม่เจอให้สร้างใหม่
            ops.append(UpdateOne({"_id": name}, {"$set": doc}, upsert=True))
            seen_names.append(name)
        if ops:
            await db.customers.bulk_write(ops)  # ส่งทีเดียวทั้งหน้า (เร็วกว่ายิงทีละรายการ)

        synced += len(rows)
        if len(rows) < PAGE_SIZE:
            break  # ได้น้อยกว่า 1 หน้า = หน้าสุดท้ายแล้ว
        start += PAGE_SIZE  # ไปหน้าถัดไป

    # 4) โหมด full: ลบรายการที่ไม่มีใน ERPNext แล้ว
    #    $nin = "not in" → ลบทุกรายการที่ _id ไม่อยู่ใน seen_names
    deleted = 0
    if full:
        result = await db.customers.delete_many({"_id": {"$nin": seen_names}})
        deleted = result.deleted_count

    # 5) จำไว้ว่ารอบนี้ sync ถึง modified ไหน (รอบหน้าเริ่มต่อจากตรงนี้)
    await db.sync_state.update_one(
        {"_id": "Customer"},
        {"$set": {"last_modified": last_modified, "synced_at": now}},
        upsert=True,
    )

    # สรุปผลส่งกลับ
    return {
        "mode": "full" if full else "incremental",
        "since": since,      # sync ต่อจาก modified ไหน (None = ทั้งหมด)
        "synced": synced,    # ได้มากี่ราย
        "deleted": deleted,  # ลบไปกี่ราย (เฉพาะ full)
    }


@router.get("/status")
async def sync_status():
    """ดูสถานะ sync ล่าสุด + จำนวนลูกค้าใน MongoDB"""
    state = await db.sync_state.find_one({"_id": "Customer"}) or {}  # ยังไม่เคย sync → {}
    return {
        "last_modified": state.get("last_modified"),
        "synced_at": state.get("synced_at"),
        "customers_in_mongo": await db.customers.count_documents({}),  # {} = นับทั้งหมด
    }
