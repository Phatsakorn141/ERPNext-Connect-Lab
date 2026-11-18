# api/Dockerfile — สูตรสร้างกล่อง api (docker compose up --build จะอ่านไฟล์นี้)

# เริ่มจาก image ที่มี Python 3.12 ติดตั้งมาแล้ว (slim = ขนาดเล็ก)
FROM python:3.12-slim

# โฟลเดอร์ทำงานในกล่อง
WORKDIR /app

# ติดตั้งแพ็กเกจก่อน (แยก step ไว้ Docker จะ cache ไม่ต้องลงใหม่ทุกครั้งที่แก้โค้ด)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ก๊อปโค้ดเข้ากล่อง
COPY . .

EXPOSE 8000

# โหมด dev: แก้โค้ดแล้ว reload อัตโนมัติ
CMD ["fastapi", "dev", "main.py", "--host", "0.0.0.0", "--port", "8000"]
