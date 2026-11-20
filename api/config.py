"""config.py — ค่าตั้งค่าทั้งหมดของ API อยู่ที่นี่ที่เดียว

ค่ามาจาก environment variable:
  .env → docker-compose.yml (ส่วน environment ของ api) → กล่อง api → Settings

pydantic-settings จับคู่ชื่อให้อัตโนมัติ (ไม่สนตัวพิมพ์เล็ก/ใหญ่):
  MONGO_URL → mongo_url,  ERP_API_KEY → erp_api_key, ...
ถ้าไม่มี environment variable → ใช้ค่า default ที่เขียนไว้ข้างล่าง
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """อ่านค่าจาก environment variable (docker-compose ส่งมาจากไฟล์ .env)"""

    # ---------- MongoDB ----------
    mongo_url: str = "mongodb://localhost:27017"  # ที่อยู่ MongoDB
    mongo_db: str = "testerp"                     # ชื่อ database

    # ---------- ERPNext ----------
    erp_url: str = "http://localhost:8080"  # ที่อยู่ ERPNext (Frappe Cloud หรือใน Docker)
    erp_api_key: str = ""                   # API Key    (ความลับ อยู่ใน .env เท่านั้น)
    erp_api_secret: str = ""                # API Secret (ความลับ อยู่ใน .env เท่านั้น)
    erp_price_list: str = "Standard Selling"  # ราคาขายของหน้าร้านมาจาก Price List นี้
    erp_warehouse: str = ""  # คลังที่หน้าร้านขายของออก ("" = หาคลังชื่อ "Stores - ..." ให้เอง)

    # ---------- ชำระเงิน (จำลอง Payment Gateway "PskPay" — ดู routes/mockpay.py) ----------
    erp_payment_mode: str = "Pskant Online"  # Mode of Payment ใน ERPNext (scripts/setup_payment.py สร้างให้)
    pskpay_secret: str = "dev-only-change-me"  # กุญแจลับที่ร้านกับ gateway รู้ 2 ฝ่าย (ความลับ อยู่ใน .env)
    pskpay_url: str = "http://localhost:8000/mockpay"  # ที่อยู่ API ของ gateway
    web_url: str = "http://localhost:3000"   # หน้าเว็บ (gateway พาลูกค้ากลับมาที่นี่)
    payment_webhook_url: str = "http://localhost:8000/payments/webhook"  # gateway ส่งผลจ่ายเงินมาที่นี่

    # ---------- Login ----------
    session_days: int = 7         # อยู่ในระบบได้กี่วันก่อนต้อง login ใหม่
    cookie_secure: bool = False   # True เมื่อใช้ https (production) — localhost เป็น http จึง False

    # ---------- Auto-sync ----------
    sync_interval: int = 60  # ดึงจาก ERPNext ทุกกี่วินาที (0 = ปิด)


# สร้างครั้งเดียว ไฟล์อื่นเรียกใช้ด้วย: from config import settings
settings = Settings()
