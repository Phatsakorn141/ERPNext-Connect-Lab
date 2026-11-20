"""routes/reviews.py — รีวิวสินค้า (เก็บใน MongoDB อย่างเดียว — ERPNext ไม่มีระบบนี้)

GET  /products/{code}/reviews   รีวิวของสินค้า (ใหม่ → เก่า)
POST /products/{code}/reviews   เขียนรีวิว → อัปเดตคะแนนเฉลี่ยในสินค้าด้วย
GET  /reviews/latest            รีวิวดีๆ ล่าสุด + คะแนนเฉลี่ยทั้งร้าน (ส่วน "Loved By Thousands")

collection "reviews":  { product_code, name, rating 1–5, comment, created_at }
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import db
from routes.products import VISIBLE

router = APIRouter(tags=["Shop: Reviews"])


class ReviewIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    rating: int = Field(ge=1, le=5)                     # 1–5 ดาว
    comment: str = Field(min_length=3, max_length=1000)


def _to_api(doc: dict) -> dict:
    """ObjectId → string (แปลงเป็น JSON ตรงๆ ไม่ได้)"""
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _summary(match: dict) -> dict:
    """คะแนนเฉลี่ย + จำนวนรีวิว  (ให้ MongoDB คำนวณด้วย aggregate)"""
    rows = await (await db.reviews.aggregate([
        {"$match": match},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ])).to_list(1)
    if not rows:
        return {"average": None, "count": 0}
    return {"average": round(rows[0]["avg"], 1), "count": rows[0]["count"]}


@router.get("/products/{code}/reviews")
async def list_reviews(code: str, limit: int = 20):
    docs = await db.reviews.find({"product_code": code}).sort("created_at", -1).to_list(limit)
    return [_to_api(d) for d in docs]


@router.post("/products/{code}/reviews", status_code=201)
async def add_review(code: str, review: ReviewIn):
    # รีวิวได้เฉพาะสินค้าที่มีอยู่จริง
    if not await db.products.find_one({"_id": code, **VISIBLE}, {"_id": 1}):
        raise HTTPException(404, f"ไม่พบสินค้า {code}")

    await db.reviews.insert_one({
        "product_code": code,
        **review.model_dump(),
        "created_at": datetime.now(timezone.utc),
    })

    # เก็บคะแนนเฉลี่ยไว้ในสินค้าเลย (denormalize) → หน้ารวมสินค้าแสดงดาวได้โดยไม่ต้องนับใหม่ทุกครั้ง
    # sync จาก ERPNext ใช้ $set แค่ field ของมันเอง → rating_* ไม่โดนทับ
    summary = await _summary({"product_code": code})
    await db.products.update_one(
        {"_id": code},
        {"$set": {"rating_avg": summary["average"], "rating_count": summary["count"]}},
    )
    return summary


@router.get("/reviews/latest")
async def latest_reviews(limit: int = 3, min_rating: int = 4):
    """รีวิวที่ได้ min_rating ดาวขึ้นไป ล่าสุด + ชื่อสินค้า + คะแนนเฉลี่ยทั้งร้าน"""
    docs = await db.reviews.find({"rating": {"$gte": min_rating}}).sort("created_at", -1).to_list(limit)

    # เติมชื่อสินค้า (ดึงทีเดียวทุกตัวด้วย $in ไม่ยิงทีละรายการ)
    codes = list({d["product_code"] for d in docs})
    names = {p["_id"]: p["item_name"] async for p in db.products.find({"_id": {"$in": codes}}, {"item_name": 1})}
    items = [_to_api(d) | {"item_name": names.get(d["product_code"])} for d in docs]

    return {**await _summary({}), "items": items}
