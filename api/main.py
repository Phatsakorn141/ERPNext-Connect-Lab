"""main.py — จุดเริ่มต้นของ FastAPI

หน้าที่ของไฟล์นี้:
1. สร้าง app (FastAPI)
2. รวม routes จากโฟลเดอร์ routes/
3. ตั้ง CORS ให้หน้าเว็บ Next.js เรียก API ได้
4. เปิด auto-sync (ดึงลูกค้าจาก ERPNext ทุก N วินาที)

รัน: fastapi dev main.py  (ใน Docker สั่งให้แล้วใน Dockerfile)
"""

import asyncio                                  # ใช้ทำงานเบื้องหลัง (background task) + sleep
import logging                                  # ใช้เขียน log
from contextlib import asynccontextmanager      # ใช้สร้าง lifespan (โค้ดตอนเปิด/ปิด API)
from datetime import datetime, timezone         # ใช้บันทึกเวลา

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel                  # ใช้กำหนดหน้าตาข้อมูลที่รับเข้ามา

from config import settings                     # ค่าตั้งค่าจาก .env
from db import client, db                       # ตัวเชื่อม MongoDB
from routes import customers, local_customers, orders, products, sync  # routes แยกไฟล์

# ใช้ logger ของ uvicorn → ข้อความจะขึ้นใน "docker compose logs api"
log = logging.getLogger("uvicorn.error")


# ==================== Auto-sync ====================

async def auto_sync_loop():
    """วนดึงลูกค้าจาก ERPNext ทุก sync_interval วินาที (ทำงานเบื้องหลังตลอดเวลา)"""
    while True:  # วนไม่รู้จบ จนกว่า API จะปิด (task.cancel())
        try:
            # เรียกฟังก์ชันเดียวกับที่ POST /sync/customers และ /sync/products ใช้
            result = await sync.sync_customers(full=False)
            if result["synced"]:  # log เฉพาะตอนมีข้อมูลใหม่ (ไม่ให้ log รก)
                log.info("auto-sync: ได้ลูกค้าใหม่/แก้ไข %s ราย", result["synced"])
            result = await sync.sync_products(full=False)
            changed = result["items"]["synced"] + result["prices"]["synced"]
            if changed:
                log.info("auto-sync: สินค้า/ราคา เปลี่ยน %s รายการ", changed)
        except Exception as e:
            # ERPNext ล่ม / เน็ตหลุด → แค่ log ไว้ รอบหน้าลองใหม่ (ไม่ให้ loop ตาย)
            log.warning("auto-sync ล้มเหลว: %s", e)
        # รอก่อนรอบถัดไป (await = ระหว่างรอ API ยังตอบ request อื่นได้ปกติ)
        await asyncio.sleep(settings.sync_interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """โค้ดก่อน yield = ตอน API เริ่ม, หลัง yield = ตอน API ปิด"""
    task = None
    if settings.sync_interval > 0:  # SYNC_INTERVAL=0 → ปิด auto-sync
        # create_task = สั่งให้ทำงานเบื้องหลัง ไม่ต้องรอให้จบ
        task = asyncio.create_task(auto_sync_loop())
        log.info("auto-sync เปิดแล้ว: ทุก %s วินาที", settings.sync_interval)
    yield  # ← API ทำงานอยู่ตรงนี้
    if task:
        task.cancel()  # API ปิด → หยุด loop


# ==================== สร้าง app ====================

# title จะแสดงที่หน้า http://localhost:8000/docs
app = FastAPI(title="TestERP Connect API", lifespan=lifespan)

# รวม routes จากไฟล์อื่น
app.include_router(customers.router)        # /erp/customers  → ERPNext ตรงๆ
app.include_router(sync.router)             # /sync           → ERPNext → MongoDB
app.include_router(local_customers.router)  # /customers      → อ่านจาก MongoDB
app.include_router(products.router)         # /products, /categories → หน้าร้าน (อ่านจาก MongoDB)
app.include_router(orders.router)           # /orders → สั่งซื้อ = Sales Order ใน ERPNext

# CORS: browser จะไม่ยอมให้เว็บ localhost:3000 เรียก API ที่ localhost:8000
# (คนละ port = คนละ origin) ถ้า API ไม่บอกว่า "อนุญาต" → ตั้งไว้ตรงนี้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # อนุญาตเฉพาะหน้าเว็บของเรา
    allow_methods=["*"],                      # GET, POST, ... ได้หมด
    allow_headers=["*"],                      # header อะไรก็ได้ (เช่น Content-Type)
)


# ==================== เช็กสถานะ ====================

@app.get("/health")
async def health():
    """เช็กว่า API ทำงาน และต่อ MongoDB ได้"""
    try:
        await client.admin.command("ping")  # สั่ง MongoDB ตอบ "pong"
        mongo = "ok"
    except Exception as e:
        mongo = f"error: {e}"
    return {"status": "ok", "mongo": mongo}


# ---------- ทดลองเขียน/อ่าน MongoDB ด้วย collection "notes" (จากบทที่ 2) ----------

class NoteIn(BaseModel):
    """ข้อมูลที่ต้องส่งมาตอน POST /notes  → {"text": "..."}"""
    text: str


@app.post("/notes")
async def create_note(note: NoteIn):
    """เพิ่มโน้ต 1 รายการลง MongoDB"""
    doc = {"text": note.text, "created_at": datetime.now(timezone.utc)}
    result = await db.notes.insert_one(doc)  # MongoDB สร้าง _id ให้อัตโนมัติ
    return {"id": str(result.inserted_id)}


@app.get("/notes")
async def list_notes():
    """อ่านโน้ตล่าสุด 50 รายการ (ใหม่ → เก่า)"""
    notes = await db.notes.find().sort("created_at", -1).to_list(50)  # -1 = มากไปน้อย
    # ObjectId แปลงเป็น JSON ตรงๆ ไม่ได้ ต้องแปลงเป็น string ก่อน
    return [{"id": str(n["_id"]), "text": n["text"]} for n in notes]
