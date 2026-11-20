"""erpnext.py — ฟังก์ชันสำหรับคุยกับ ERPNext REST API

ERPNext มี API มาตรฐานให้ทุก DocType (Customer, Item, Sales Order, ...):
  GET  /api/resource/<DocType>          → ดึงรายการ
  GET  /api/resource/<DocType>/<name>   → ดึง 1 รายการ
  POST /api/resource/<DocType>          → สร้างใหม่
  PUT  /api/resource/<DocType>/<name>   → แก้ไข

ทุก request ต้องแนบ header:  Authorization: token <API_KEY>:<API_SECRET>
ไฟล์นี้ทำให้ทั้งหมด → ไฟล์อื่นเรียกแค่ get_list / get_doc / create_doc / update_doc
"""

import json                       # แปลง list/dict เป็น JSON string
from urllib.parse import quote    # แปลงข้อความให้ใส่ใน URL ได้

import httpx                      # ตัวส่ง HTTP request (แบบ async)
from fastapi import HTTPException # ใช้ตอบ error กลับไปหา browser

from config import settings


# ==================== ฟังก์ชันภายใน (ขึ้นต้นด้วย _ = ใช้ในไฟล์นี้เท่านั้น) ====================

def _client() -> httpx.AsyncClient:
    """สร้าง client ที่แนบ API key ไปทุก request"""
    return httpx.AsyncClient(
        base_url=settings.erp_url,  # path ที่ส่งไปจะต่อท้าย URL นี้
        headers={"Authorization": f"token {settings.erp_api_key}:{settings.erp_api_secret}"},
        timeout=20,  # รอไม่เกิน 20 วินาที ไม่งั้นถือว่า error
    )


async def _request(method: str, path: str, **kwargs) -> dict:
    """ส่ง request ไป ERPNext ถ้า error แปลงเป็น HTTPException ให้ FastAPI ตอบกลับ

    method = "GET" / "POST" / ...
    path   = เช่น "/api/resource/Customer"
    kwargs = ส่งต่อให้ httpx เช่น params=... (query string), json=... (body)
    """
    try:
        # async with = เปิด client แล้วปิดให้อัตโนมัติเมื่อจบ
        async with _client() as client:
            r = await client.request(method, path, **kwargs)
    except httpx.RequestError as e:
        # ต่อไม่ติดเลย (เน็ตหลุด, URL ผิด, ERPNext ล่ม) → 502 Bad Gateway
        raise HTTPException(502, f"ต่อ ERPNext ไม่ได้: {e}")

    if r.status_code >= 400:
        # ERPNext ตอบ error (เช่น 404 ไม่พบ, 403 ไม่มีสิทธิ์) → ส่ง code เดิมกลับไป
        raise HTTPException(r.status_code, f"ERPNext: {_error_message(r)}")
    return r.json()


def _error_message(r: httpx.Response) -> str:
    """ดึงข้อความ error ที่อ่านรู้เรื่องจาก response ของ ERPNext"""
    try:
        body = r.json()
        # ERPNext เก็บข้อความไว้ใน _server_messages (JSON ซ้อน JSON)
        #   "_server_messages": "[\"{\\\"message\\\": \\\"Customer X not found\\\"}\"]"
        #   → json.loads ครั้งแรกได้ list ของ string → ครั้งที่สองได้ dict
        msgs = json.loads(body.get("_server_messages", "[]"))
        if msgs:
            return json.loads(msgs[0]).get("message", "")
        # ไม่มี _server_messages → ใช้ชื่อ error หรือข้อความดิบแทน
        return body.get("exc_type") or body.get("message") or r.text[:200]
    except ValueError:
        # response ไม่ใช่ JSON (เช่นหน้า HTML error) → ตัดมาแค่ 200 ตัวอักษร
        return r.text[:200]


# ==================== ฟังก์ชันที่ไฟล์อื่นเรียกใช้ ====================

async def get_list(
    doctype: str,
    fields: list[str] | None = None,
    filters: list | None = None,
    limit: int = 20,
    start: int = 0,
    order_by: str | None = None,
) -> list[dict]:
    """ดึงรายการของ DocType  เช่น get_list("Customer", ["name", "customer_name"])

    fields   = field ที่อยากได้ (ไม่ใส่ = ได้แค่ name)
    filters  = เงื่อนไข เช่น [["customer_name", "like", "%pop%"]]
    limit    = เอากี่รายการ
    start    = ข้ามกี่รายการ (ใช้แบ่งหน้า)
    order_by = เรียงลำดับ เช่น "modified asc"
    """
    params = {
        "fields": json.dumps(fields or ["name"]),  # ERPNext รับเป็น JSON string
        "limit_page_length": limit,
        "limit_start": start,
    }
    if filters:
        params["filters"] = json.dumps(filters)
    if order_by:
        params["order_by"] = order_by
    # params → httpx แปลงเป็น query string ให้ เช่น ?fields=...&limit_page_length=20
    data = await _request("GET", f"/api/resource/{doctype}", params=params)
    return data["data"]  # ERPNext ห่อผลไว้ใน {"data": [...]}


async def create_doc(doctype: str, data: dict) -> dict:
    """สร้างรายการใหม่ใน ERPNext แล้วคืนข้อมูลที่บันทึกแล้ว (มี name ที่ ERPNext ตั้งให้)

    เช่น create_doc("Customer", {"customer_name": "ร้าน A", "customer_type": "Company"})
    """
    # json=data → httpx แปลง dict เป็น JSON body + ตั้ง Content-Type ให้
    result = await _request("POST", f"/api/resource/{doctype}", json=data)
    return result["data"]


async def update_doc(doctype: str, name: str, data: dict) -> dict:
    """แก้ไขรายการที่มีอยู่ (ส่งเฉพาะ field ที่จะเปลี่ยน)  เช่น update_doc("Item", "HP-001", {"is_stock_item": 1})"""
    result = await _request("PUT", f"/api/resource/{doctype}/{quote(name, safe='')}", json=data)
    return result["data"]


async def call(method: str, data: dict | None = None):
    """เรียกฟังก์ชันฝั่ง ERPNext ที่เปิดให้เรียกผ่าน API (whitelisted)  → /api/method/<method>

    เช่น call("erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice", {"source_name": "SAL-ORD-..."})
    """
    result = await _request("POST", f"/api/method/{method}", json=data or {})
    return result.get("message")  # ERPNext ห่อผลไว้ใน {"message": ...}


async def get_doc(doctype: str, name: str) -> dict:
    """ดึงข้อมูลเต็มของ 1 รายการ (ทุก field)"""
    # quote: แปลงชื่อที่มีเว้นวรรค / ภาษาไทย / "/" ให้ใส่ใน URL ได้
    #   safe='' = แปลง "/" ด้วย (ไม่งั้นชื่อที่มี / จะกลายเป็น path ใหม่)
    data = await _request("GET", f"/api/resource/{doctype}/{quote(name, safe='')}")
    return data["data"]
