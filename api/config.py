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

    # ---------- Auto-sync ----------
    sync_interval: int = 60  # ดึงจาก ERPNext ทุกกี่วินาที (0 = ปิด)


# สร้างครั้งเดียว ไฟล์อื่นเรียกใช้ด้วย: from config import settings
settings = Settings()
