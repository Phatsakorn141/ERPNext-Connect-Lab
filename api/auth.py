"""auth.py — ส่วนกลางของระบบ login: เข้ารหัสรหัสผ่าน, session, หาผู้ใช้จาก cookie

แนวคิด (session แบบ cookie):
  1. login สำเร็จ → สุ่ม token ยาวๆ → เก็บ "hash ของ token" ใน MongoDB (collection sessions)
  2. ส่ง token ให้ browser เป็น cookie แบบ httpOnly (JavaScript อ่านไม่ได้ → กันขโมยด้วย XSS)
  3. request ถัดไป browser แนบ cookie มาเอง → hash แล้วหาใน sessions → รู้ว่าเป็นใคร
  4. logout → ลบ session ทิ้ง (token เดิมใช้ไม่ได้ทันที)

ทำไมเก็บ hash ไม่เก็บ token ตรงๆ?  ถ้าฐานข้อมูลหลุด คนร้ายก็เอา hash ไปใช้ login แทนไม่ได้
ทำไม argon2?  เป็นวิธีเข้ารหัสรหัสผ่านที่ "ช้าโดยตั้งใจ" → เดารหัสทีละล้านครั้งไม่ไหว
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, Response
from pwdlib import PasswordHash

from config import settings
from db import db

COOKIE = "pskant_session"  # ชื่อ cookie

password_hash = PasswordHash.recommended()  # = argon2
# ใช้ตอนไม่เจอผู้ใช้: ยังเสียเวลาตรวจรหัสเท่าเดิม → เดาไม่ได้ว่าอีเมลไหนมีบัญชี (จากเวลาที่ตอบ)
DUMMY_HASH = password_hash.hash("dummy-password-for-timing")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def public_user(user: dict) -> dict:
    """ข้อมูลผู้ใช้ที่ส่งออกไปได้ (ไม่มี password_hash!)"""
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "customer": user["customer"],  # name ของ Customer ใน ERPNext
    }


async def create_session(response: Response, user_id) -> None:
    """สร้าง session + ตั้ง cookie ใน response"""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.session_days)
    await db.sessions.insert_one({"_id": _hash_token(token), "user_id": user_id, "expires_at": expires})
    response.set_cookie(
        COOKIE, token,
        httponly=True,                 # JavaScript ใน browser อ่าน cookie นี้ไม่ได้
        samesite="lax",                # เว็บอื่นส่ง POST มาพร้อม cookie นี้ไม่ได้ (กัน CSRF ระดับหนึ่ง)
        secure=settings.cookie_secure, # ส่งเฉพาะ https (เปิดตอน production)
        max_age=settings.session_days * 86400,
        path="/",
    )


async def delete_session(response: Response, token: str | None) -> None:
    if token:
        await db.sessions.delete_one({"_id": _hash_token(token)})
    response.delete_cookie(COOKIE, path="/")


# ==================== Dependency: ใส่ใน endpoint เพื่อรู้ว่าใครเรียก ====================

async def optional_user(session: str | None = Cookie(default=None, alias=COOKIE)) -> dict | None:
    """คืนผู้ใช้ถ้า login อยู่, ไม่ได้ login → None   ใช้: user = Depends(optional_user)"""
    if not session:
        return None
    s = await db.sessions.find_one({"_id": _hash_token(session)})
    if not s or s["expires_at"] < datetime.now(timezone.utc):
        return None  # ไม่มี session นี้ หรือหมดอายุแล้ว
    return await db.users.find_one({"_id": s["user_id"]})


async def require_user(user: dict | None = Depends(optional_user)) -> dict:
    """เหมือน optional_user แต่บังคับ login   ใช้: user = Depends(require_user)"""
    if not user:
        raise HTTPException(401, "กรุณาเข้าสู่ระบบ")
    return user
