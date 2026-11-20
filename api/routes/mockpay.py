"""routes/mockpay.py — "PskPay" Payment Gateway จำลอง (แกล้งทำเป็นบริษัทภายนอก)

ของจริง (Stripe, Omise, 2C2P ...) อยู่คนละ server กับร้านเรา ไฟล์นี้จำลองให้ทำงานเหมือนกัน:

  ร้าน (payments.py)                    PskPay (ไฟล์นี้)                 หน้าเว็บ
  ───────────────────                   ────────────────                  ───────
  1. POST /mockpay/sessions  ─────────→ สร้าง session (ยอดเงิน)
                             ←───────── {id, url}
  2.                                                               ←──── พาลูกค้าไปหน้า url
  3.                                    POST .../complete  ←──────────── ลูกค้ากด "จ่าย"
  4. POST /payments/webhook  ←───────── แจ้งผล + ลายเซ็น (HMAC)
  5.                                    → พาลูกค้ากลับ return_url

กติกาเดียวกับ gateway จริง:
- ร้านต้องแนบกุญแจลับ (Authorization: Bearer ...) ตอนสร้าง session → คนอื่นสร้างแทนร้านไม่ได้
- ผลการจ่ายเงิน "ห้ามเชื่อจาก browser" → gateway ส่งตรงหาร้านเป็น webhook ที่มีลายเซ็น
- ส่ง webhook ไม่สำเร็จ → ลองใหม่ (retry)
"""

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel, Field

from config import settings
from db import db

router = APIRouter(prefix="/mockpay", tags=["PskPay (gateway จำลอง)"])
log = logging.getLogger("pskpay")

RETRY_DELAYS = [0, 2, 5, 10]  # ส่ง webhook: ทันที, แล้วรอ 2, 5, 10 วินาทีถ้ายังไม่สำเร็จ


def sign(body: bytes, timestamp: int) -> str:
    """ลายเซ็น = HMAC-SHA256(กุญแจลับ, "เวลา.เนื้อหา")

    ใส่เวลาด้วย → เอา webhook เก่าที่ดักได้มายิงซ้ำทีหลังไม่ได้ (ร้านเช็กว่าเวลาไม่เก่าเกินไป)
    """
    msg = f"{timestamp}.".encode() + body
    return hmac.new(settings.pskpay_secret.encode(), msg, hashlib.sha256).hexdigest()


# ==================== 1) ร้านสร้าง session ====================

class SessionIn(BaseModel):
    amount: float = Field(gt=0)
    currency: str = "THB"
    merchant_ref: str        # รหัสอ้างอิงของร้าน (token ของออเดอร์)
    description: str = ""
    return_url: str          # จ่ายเสร็จพาลูกค้ากลับไปที่ไหน


@router.post("/sessions", status_code=201)
async def create_session(body: SessionIn, authorization: str = Header(default="")):
    # เฉพาะร้านที่มีกุญแจลับ  (compare_digest = เทียบแบบใช้เวลาเท่ากันเสมอ กันเดาทีละตัวอักษร)
    if not hmac.compare_digest(authorization, f"Bearer {settings.pskpay_secret}"):
        raise HTTPException(401, "invalid API key")
    session_id = "cs_" + secrets.token_urlsafe(12)
    await db.pskpay_sessions.insert_one({
        "_id": session_id, **body.model_dump(),
        "status": "open", "created_at": datetime.now(timezone.utc), "webhook_attempts": 0,
    })
    # หน้าจ่ายเงินของ gateway (ของจริงจะเป็นโดเมนของ gateway เอง)
    return {"id": session_id, "url": f"{settings.web_url}/pskpay/{session_id}"}


# ==================== 2) หน้าจ่ายเงินดึงข้อมูล session ====================

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    s = await db.pskpay_sessions.find_one({"_id": session_id})
    if not s:
        raise HTTPException(404, "session not found")
    # ส่งเฉพาะที่หน้าจ่ายเงินต้องแสดง (ไม่ส่ง merchant_ref / return_url ภายใน)
    return {"id": s["_id"], "merchant": "Pskant Shop", "amount": s["amount"], "currency": s["currency"],
            "description": s["description"], "status": s["status"]}


# ==================== 3) ลูกค้ากดจ่าย (หรือจำลองว่าล้มเหลว) ====================

class CompleteIn(BaseModel):
    result: Literal["paid", "failed"]


@router.post("/sessions/{session_id}/complete")
async def complete_session(session_id: str, body: CompleteIn, tasks: BackgroundTasks):
    s = await db.pskpay_sessions.find_one({"_id": session_id})
    if not s:
        raise HTTPException(404, "session not found")
    if s["status"] == "paid":
        raise HTTPException(409, "already paid")  # จ่ายซ้ำไม่ได้

    payment_id = "pay_" + secrets.token_urlsafe(10) if body.result == "paid" else None
    await db.pskpay_sessions.update_one(
        {"_id": session_id}, {"$set": {"status": body.result, "payment_id": payment_id}})

    event = {
        "id": "evt_" + secrets.token_urlsafe(10),
        "type": "payment.succeeded" if body.result == "paid" else "payment.failed",
        "session_id": session_id,
        "payment_id": payment_id,
        "merchant_ref": s["merchant_ref"],
        "amount": s["amount"],
        "currency": s["currency"],
    }
    # ส่ง webhook "เบื้องหลัง" → ตอบ browser ได้ทันทีไม่ต้องรอร้านประมวลผล
    tasks.add_task(_deliver_webhook, session_id, event)
    return {"redirect_url": s["return_url"]}


# ==================== 4) ส่ง webhook หาร้าน (มี retry) ====================

async def _deliver_webhook(session_id: str, event: dict):
    body = json.dumps(event).encode()
    for delay in RETRY_DELAYS:
        await asyncio.sleep(delay)
        ts = int(time.time())
        await db.pskpay_sessions.update_one({"_id": session_id}, {"$inc": {"webhook_attempts": 1}})
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(settings.payment_webhook_url, content=body, headers={
                    "Content-Type": "application/json",
                    "X-PskPay-Signature": f"t={ts},v1={sign(body, ts)}",
                })
            if r.status_code < 300:
                log.info("webhook %s → %s", event["type"], r.status_code)
                return
            log.warning("webhook %s → %s %s (จะลองใหม่)", event["type"], r.status_code, r.text[:200])
        except httpx.RequestError as e:
            log.warning("webhook ส่งไม่ได้: %s (จะลองใหม่)", e)
    log.error("webhook %s ส่งไม่สำเร็จ ยอมแพ้แล้ว", event["id"])
