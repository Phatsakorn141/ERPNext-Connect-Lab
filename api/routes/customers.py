"""routes/customers.py — /erp/customers: คุยกับ ERPNext ตรงๆ

ต่างจาก /customers (local_customers.py) ที่อ่านจาก MongoDB:
  /erp/customers → ได้ข้อมูลสดจาก ERPNext เสมอ แต่ช้ากว่า + ใช้ไม่ได้ถ้า ERPNext ล่ม
"""

from typing import Literal  # ใช้บังคับว่าค่าต้องเป็นค่าใดค่าหนึ่งในที่กำหนด

from fastapi import APIRouter
from pydantic import BaseModel, Field

import erpnext
from routes import sync

router = APIRouter(prefix="/erp/customers", tags=["ERPNext: Customer"])

# field ที่อยากได้ (ชื่อ field ดูได้จากหน้า Customer > Customize Form ใน ERPNext)
FIELDS = ["name", "customer_name", "customer_type", "customer_group", "territory"]


class CustomerIn(BaseModel):
    """ข้อมูลที่หน้าเว็บส่งมาตอนสร้างลูกค้า (Pydantic ตรวจให้ก่อนถึงโค้ดเรา)

    ข้อมูลไม่ถูกต้อง → FastAPI ตอบ 422 กลับไปเอง ไม่ต้องเขียน if เช็กเอง
    """

    # ต้องมีอย่างน้อย 1 ตัวอักษร ไม่เกิน 140 (ความยาวสูงสุดของ ERPNext)
    customer_name: str = Field(min_length=1, max_length=140)
    # รับได้แค่ 2 ค่านี้ ไม่ส่งมา = "Company"
    customer_type: Literal["Company", "Individual"] = "Company"


@router.get("")
async def list_customers(search: str | None = None, limit: int = 20):
    """รายชื่อลูกค้า  ใส่ ?search=abc เพื่อค้นหาจากชื่อ"""
    # like + %...% = ชื่อที่มีคำนี้อยู่ตรงไหนก็ได้
    filters = [["customer_name", "like", f"%{search}%"]] if search else None
    return await erpnext.get_list("Customer", FIELDS, filters, limit)


@router.post("", status_code=201)  # 201 = Created (สร้างสำเร็จ)
async def create_customer(customer: CustomerIn):
    """สร้างลูกค้าใน ERPNext แล้ว sync ลง MongoDB ทันที (ไม่ต้องรอ auto-sync)"""
    # model_dump() = แปลง Pydantic object เป็น dict → {"customer_name": ..., "customer_type": ...}
    doc = await erpnext.create_doc("Customer", customer.model_dump())
    # sync ทันที → หน้าเว็บโหลดรายชื่อจาก MongoDB แล้วเห็นลูกค้าใหม่เลย
    await sync.sync_customers(full=False)
    return {"name": doc["name"], "customer_name": doc["customer_name"]}


@router.get("/{name}")
async def get_customer(name: str):
    """ข้อมูลเต็มของลูกค้า 1 ราย ({name} ใน path → ตัวแปร name)"""
    return await erpnext.get_doc("Customer", name)
