"""db.py — ตัวเชื่อม MongoDB

ไฟล์อื่นเรียกใช้ด้วย: from db import db
แล้วใช้ db.<ชื่อ collection> ได้เลย เช่น db.customers, db.notes, db.sync_state
(collection ยังไม่มี → MongoDB สร้างให้เองตอนเขียนข้อมูลครั้งแรก)
"""

from pymongo import AsyncMongoClient  # client แบบ async (ใช้กับ await ได้)

from config import settings

# สร้าง client ครั้งเดียว ใช้ร่วมกันทั้งแอป (ไม่ต้องเปิด/ปิด connection ทุก request)
# tz_aware=True: เวลาที่อ่านกลับมามีโซนเวลา (UTC) ติดมาด้วย
client = AsyncMongoClient(settings.mongo_url, tz_aware=True)

# เลือก database ตามชื่อใน settings (ค่าเริ่มต้น "testerp")
db = client[settings.mongo_db]
