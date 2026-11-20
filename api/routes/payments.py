"""routes/payments.py — ชำระเงินออนไลน์ (ฝั่งร้าน) + ลงบัญชีใน ERPNext

POST /payments/{token}/checkout   ขอลิงก์จ่ายเงินจาก gateway (PskPay) สำหรับออเดอร์นี้
POST /payments/webhook            gateway แจ้งผล → จ่ายสำเร็จ = ลงเอกสารใน ERPNext

เอกสารที่เกิดใน ERPNext เมื่อจ่ายสำเร็จ (วงจรขายมาตรฐาน):
  Sales Order (Draft) ──Submit──→ Sales Order (จองสต็อก)
                      ──────────→ Sales Invoice  (ใบแจ้งหนี้: ลูกค้าเป็นหนี้เรา  Dr ลูกหนี้ / Cr รายได้)
                      ──────────→ Payment Entry  (รับเงิน: หนี้หมด          Dr เงินออนไลน์ / Cr ลูกหนี้)

ทุกขั้น "ทำซ้ำได้ (idempotent)": ถ้าทำไปแล้วจะข้าม
→ gateway ส่ง webhook ซ้ำ หรือขั้นไหนพังกลางทาง แล้วส่งมาใหม่ ไม่เกิดเอกสารซ้ำ
"""

import hmac
import logging
import time
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request

import erpnext
from config import settings
from db import db
from routes.mockpay import sign

router = APIRouter(prefix="/payments", tags=["Shop: Payments"])
log = logging.getLogger("payments")

BANGKOK = timezone(timedelta(hours=7))
SIGNATURE_TOLERANCE = 300  # webhook เก่ากว่า 5 นาที → ไม่รับ (กันเอามายิงซ้ำ)


# ==================== 1) ขอลิงก์จ่ายเงิน ====================

@router.post("/{token}/checkout")
async def checkout(token: str):
    order = await db.orders.find_one({"_id": token})
    if not order:
        raise HTTPException(404, "ไม่พบคำสั่งซื้อ")
    payment = order.get("payment") or {}
    if payment.get("status") == "paid":
        raise HTTPException(409, "ออเดอร์นี้จ่ายเงินแล้ว")

    # ยอดเงินมาจาก MongoDB (ยอดที่ ERPNext คำนวณ) — ไม่รับยอดจาก browser
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{settings.pskpay_url}/sessions",
                headers={"Authorization": f"Bearer {settings.pskpay_secret}"},
                json={
                    "amount": order["grand_total"],
                    "currency": order["currency"],
                    "merchant_ref": token,
                    "description": f"Pskant Shop order {order['order_no']}",
                    "return_url": f"{settings.web_url}/order/{token}",
                },
            )
        r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"ต่อ payment gateway ไม่ได้: {e}")
    session = r.json()

    await db.orders.update_one({"_id": token}, {"$set": {
        "payment.status": "pending", "payment.session_id": session["id"], "payment.error": None}})
    return {"checkout_url": session["url"]}


# ==================== 2) webhook จาก gateway ====================

def _verify_signature(body: bytes, header: str):
    """ตรวจลายเซ็น "t=<เวลา>,v1=<hmac>" — ไม่ผ่าน = ไม่ได้มาจาก gateway ตัวจริง"""
    try:
        parts = dict(p.split("=", 1) for p in header.split(","))
        ts, received = int(parts["t"]), parts["v1"]
    except (ValueError, KeyError):
        raise HTTPException(400, "bad signature header")
    if abs(time.time() - ts) > SIGNATURE_TOLERANCE:
        raise HTTPException(400, "signature too old")
    if not hmac.compare_digest(received, sign(body, ts)):
        raise HTTPException(400, "invalid signature")


@router.post("/webhook")
async def webhook(request: Request):
    # ต้องใช้ body "ดิบ" ตรวจลายเซ็น (แปลงเป็น JSON แล้วแปลงกลับ ตัวอักษรอาจไม่ตรงเดิม)
    body = await request.body()
    _verify_signature(body, request.headers.get("X-PskPay-Signature", ""))
    event = await request.json()

    order = await db.orders.find_one({"_id": event["merchant_ref"]})
    if not order:
        return {"ignored": "unknown order"}  # 2xx → gateway จะได้ไม่ส่งซ้ำ
    payment = order.get("payment") or {}
    if event["session_id"] != payment.get("session_id"):
        return {"ignored": "old session"}  # session เก่าที่ไม่ได้ใช้แล้ว

    if event["type"] == "payment.failed":
        if payment.get("status") != "paid":
            await db.orders.update_one({"_id": order["_id"]}, {"$set": {"payment.status": "failed"}})
        return {"ok": True}

    # ---------- payment.succeeded ----------
    if abs(event["amount"] - order["grand_total"]) > 0.001:
        # ยอดไม่ตรง = ผิดปกติ → ไม่ลงบัญชีอัตโนมัติ ให้คนตรวจ
        await db.orders.update_one({"_id": order["_id"]}, {"$set": {
            "payment.status": "review", "payment.error": f"amount mismatch: {event['amount']}"}})
        return {"ok": True}

    if payment.get("status") != "paid":
        await db.orders.update_one({"_id": order["_id"]}, {"$set": {
            "payment.status": "paid",
            "payment.payment_id": event["payment_id"],
            "payment.paid_at": datetime.now(timezone.utc),
        }})

    # ลงบัญชีใน ERPNext — พัง → ตอบ 500 → gateway ส่งมาใหม่ → ทำต่อจากขั้นที่ค้าง
    try:
        await post_to_erp(order["_id"])
    except HTTPException as e:
        await db.orders.update_one({"_id": order["_id"]}, {"$set": {"payment.error": e.detail}})
        log.error("ลงบัญชี ERPNext ไม่สำเร็จ %s: %s", order["order_no"], e.detail)
        raise HTTPException(500, "ERPNext posting failed, please retry")
    return {"ok": True}


# ==================== 3) ลงเอกสารใน ERPNext ====================

async def _payment_account() -> str:
    """บัญชีที่เงินออนไลน์เข้า = default account ของ Mode of Payment"""
    mode = await erpnext.get_doc("Mode of Payment", settings.erp_payment_mode)
    if not mode["accounts"]:
        raise HTTPException(500, f"Mode of Payment {settings.erp_payment_mode} ยังไม่ผูกบัญชี")
    return mode["accounts"][0]["default_account"]


def _clean(doc: dict) -> dict:
    """เอกสารที่ ERPNext "map" ให้ (ยังไม่บันทึก) มี field ภายในขึ้นต้นด้วย __ → ตัดทิ้งก่อนส่งกลับไปสร้าง"""
    return {k: v for k, v in doc.items() if not k.startswith("__")}


async def post_to_erp(token: str):
    order = await db.orders.find_one({"_id": token})
    so_name = order["order_no"]
    payment = order["payment"]

    # (ก) Submit Sales Order: docstatus 0 → 1  (ERPNext จองสต็อกให้)
    so = await erpnext.get_doc("Sales Order", so_name)
    if so["docstatus"] == 2:
        raise HTTPException(409, f"{so_name} ถูก Cancel ไปแล้ว")
    if so["docstatus"] == 0:
        await erpnext.update_doc("Sales Order", so_name, {"docstatus": 1})

    # (ข) Sales Invoice จาก Sales Order
    invoice = payment.get("invoice")
    if not invoice:
        # มีใบที่ Submit แล้วอยู่ก่อนไหม (เช่นรอบก่อนสร้างแล้วแต่บันทึกลง MongoDB ไม่ทัน)
        found = await erpnext.get_list(
            "Sales Invoice", ["name"],
            [["Sales Invoice Item", "sales_order", "=", so_name], ["docstatus", "=", 1]], limit=1)
        if found:
            invoice = found[0]["name"]
        else:
            # make_sales_invoice = ฟังก์ชันของ ERPNext ที่ก๊อปข้อมูลจาก SO มาเป็นใบแจ้งหนี้ (ยังไม่บันทึก)
            draft = await erpnext.call(
                "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
                {"source_name": so_name})
            invoice = (await erpnext.create_doc("Sales Invoice", _clean(draft) | {"docstatus": 1}))["name"]
        await db.orders.update_one({"_id": token}, {"$set": {"payment.invoice": invoice}})

    # (ค) Payment Entry รับเงินตาม Invoice
    entry = payment.get("payment_entry")
    if not entry:
        found = await erpnext.get_list(
            "Payment Entry", ["name"],
            [["Payment Entry Reference", "reference_name", "=", invoice], ["docstatus", "=", 1]], limit=1)
        if found:
            entry = found[0]["name"]
        else:
            account = await _payment_account()
            draft = await erpnext.call(
                "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
                {"dt": "Sales Invoice", "dn": invoice, "bank_account": account})
            entry = (await erpnext.create_doc("Payment Entry", _clean(draft) | {
                "mode_of_payment": settings.erp_payment_mode,
                "reference_no": payment["payment_id"],       # เลขอ้างอิงจาก gateway (ใช้กระทบยอดทีหลัง)
                "reference_date": datetime.now(BANGKOK).date().isoformat(),
                "docstatus": 1,
            }))["name"]

    # (ง) อัปเดตสถานะใน MongoDB ให้หน้าเว็บแสดง
    so = await erpnext.get_doc("Sales Order", so_name)
    await db.orders.update_one({"_id": token}, {"$set": {
        "status": so["status"], "payment.payment_entry": entry, "payment.error": None}})
    log.info("ลงบัญชีแล้ว %s → %s, %s", so_name, invoice, entry)
