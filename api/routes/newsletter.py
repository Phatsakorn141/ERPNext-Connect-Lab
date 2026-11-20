"""routes/newsletter.py — สมัครรับข่าว (กล่อง "Stay in the Loop")

collection "newsletter":  { _id: อีเมล (ตัวเล็ก), created_at }
ใช้อีเมลเป็น _id → สมัครซ้ำกี่ครั้งก็มีแค่รายการเดียว
"""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from db import db

router = APIRouter(tags=["Shop: Newsletter"])


class SubscribeIn(BaseModel):
    email: EmailStr


@router.post("/newsletter", status_code=201)
async def subscribe(body: SubscribeIn):
    email = body.email.lower()  # A@x.com กับ a@x.com = คนเดียวกัน
    # $setOnInsert = ตั้งค่าเฉพาะตอนสร้างใหม่ (สมัครซ้ำ → ไม่เปลี่ยนวันที่สมัครเดิม)
    result = await db.newsletter.update_one(
        {"_id": email},
        {"$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    # upserted_id มีค่า = เพิ่งสร้างใหม่,  None = มีอยู่แล้ว
    return {"subscribed": True, "already": result.upserted_id is None}
