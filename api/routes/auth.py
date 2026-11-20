"""routes/auth.py — สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ

POST /auth/register   สร้างบัญชี (MongoDB) + Customer (ERPNext) แล้ว login ให้เลย
POST /auth/login      ตรวจรหัสผ่าน → ตั้ง cookie session
POST /auth/logout     ลบ session + cookie
GET  /auth/me         ข้อมูลผู้ใช้ที่ login อยู่ (ไม่ได้ login → 401)

collection "users": { name, email (ตัวเล็ก, ห้ามซ้ำ), password_hash, customer, created_at }
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

import erpnext
from auth import (COOKIE, DUMMY_HASH, create_session, delete_session, password_hash,
                  public_user, require_user)
from db import db

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)  # อย่างน้อย 8 ตัว


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


@router.post("/register", status_code=201)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}, {"_id": 1}):
        raise HTTPException(409, "อีเมลนี้มีบัญชีแล้ว")

    # 1) สร้าง Customer ใน ERPNext ก่อน (ถ้าพัง → ยังไม่มีบัญชีค้างใน MongoDB)
    #    ชื่อซ้ำกับลูกค้าเดิม → ERPNext ตั้งชื่อใหม่ให้เอง เช่น "Somchai - 1"
    customer = await erpnext.create_doc("Customer", {
        "customer_name": body.name,
        "customer_type": "Individual",
    })

    # 2) สร้างบัญชี — เก็บแค่ hash ของรหัสผ่าน ห้ามเก็บรหัสจริง
    user = {
        "name": body.name,
        "email": email,
        "password_hash": password_hash.hash(body.password),
        "customer": customer["name"],
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError:  # สมัครพร้อมกัน 2 ครั้ง → unique index กันไว้
        raise HTTPException(409, "อีเมลนี้มีบัญชีแล้ว")
    user["_id"] = result.inserted_id

    # 3) login ให้เลย
    await create_session(response, user["_id"])
    return public_user(user)


@router.post("/login")
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    # ตรวจรหัสเสมอ (ไม่เจอผู้ใช้ก็ตรวจกับ DUMMY_HASH) → ใช้เวลาเท่ากัน เดาอีเมลจากเวลาไม่ได้
    ok = password_hash.verify(body.password, user["password_hash"] if user else DUMMY_HASH)
    if not user or not ok:
        # ข้อความเดียวกันทั้ง 2 กรณี → ไม่บอกว่าอีเมลนี้มีบัญชีไหม
        raise HTTPException(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    await create_session(response, user["_id"])
    return public_user(user)


@router.post("/logout")
async def logout(response: Response, session: str | None = Cookie(default=None, alias=COOKIE)):
    await delete_session(response, session)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(require_user)):
    return public_user(user)
