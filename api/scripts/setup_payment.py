"""scripts/setup_payment.py — ตั้งค่าบัญชีรับเงินออนไลน์ใน ERPNext

⚠️ สคริปต์นี้ "เขียนข้อมูลจริง" ลง ERPNext ที่ ERP_URL ชี้อยู่
รัน (ในโฟลเดอร์ TestERP Connect):
    docker compose exec api python -m scripts.setup_payment

สร้าง 2 อย่าง (มีแล้วข้าม):
1. Account "Online Payments - <ตัวย่อบริษัท>"  ประเภท Bank อยู่ใต้ "Bank Accounts"
   = เงินที่ลูกค้าจ่ายผ่านเว็บเข้าบัญชีนี้ (แยกจากเงินสดหน้าร้าน)
2. Mode of Payment "Pskant Online" ผูกกับบัญชีข้อ 1
   = ช่องทางรับเงิน ที่ Payment Entry ใช้อ้างอิง
"""

import asyncio

import erpnext
from config import settings


async def main():
    print(f"ERPNext: {settings.erp_url}")
    company = (await erpnext.get_list("Company", ["name", "abbr"], limit=1))[0]
    abbr = company["abbr"]

    # 1) บัญชีธนาคาร
    account = f"Online Payments - {abbr}"
    if await erpnext.get_list("Account", ["name"], [["name", "=", account]], limit=1):
        print(f"  = {account} (มีแล้ว)")
    else:
        await erpnext.create_doc("Account", {
            "account_name": "Online Payments",
            "parent_account": f"Bank Accounts - {abbr}",
            "company": company["name"],
            "account_type": "Bank",
            "is_group": 0,
        })
        print(f"  + {account}")

    # 2) ช่องทางรับเงิน
    mode = settings.erp_payment_mode
    if await erpnext.get_list("Mode of Payment", ["name"], [["name", "=", mode]], limit=1):
        print(f"  = Mode of Payment {mode} (มีแล้ว)")
    else:
        await erpnext.create_doc("Mode of Payment", {
            "mode_of_payment": mode,
            "type": "Bank",
            "accounts": [{"company": company["name"], "default_account": account}],
        })
        print(f"  + Mode of Payment {mode} → {account}")


if __name__ == "__main__":
    asyncio.run(main())
