# TestERP Connect — แผนการเรียน

```
Browser → Next.js (web/, JavaScript)   หน้าเว็บอย่างเดียว
              ↓ fetch
          FastAPI (api/, Python)        ตัวกลาง ถือ API key
            ├→ MongoDB                  เก็บสำเนาข้อมูล / ข้อมูลฝั่งเว็บ
            └→ ERPNext REST API         ข้อมูลตัวจริงของธุรกิจ
```
- mongo, api (และ ERPNext) รันใน Docker ผ่าน `docker-compose.yml`
- web (Next.js) รันในเครื่องด้วย `cd web` → `npm run dev` (บน Windows hot reload ในกล่องไม่ทำงาน)

| บท | หัวข้อ | สถานะ |
|---|---|---|
| 1 | โครงโปรเจกต์: Next.js (JS) + FastAPI (Python) | ✅ |
| 2 | Docker Compose: mongo + api + web, FastAPI ต่อ MongoDB | ✅ |
| 3 | ERPNext (Frappe Cloud / Docker) + สร้าง API Key | ✅ |
| 4 | FastAPI เรียก ERPNext API (ดึง Customer) → `GET /erp/customers` | ✅ |
| 5 | Sync: ERPNext → MongoDB → `POST /sync/customers`, `GET /customers` | ✅ |
| 5.1 | Auto-sync (polling ทุก `SYNC_INTERVAL` วินาที) | ✅ |
| 6 | Next.js หน้า `/customers` + `POST /erp/customers` สร้างลูกค้าใน ERPNext | ✅ |

## Pskant Shop (หน้าร้าน)
| เฟส | หัวข้อ | สถานะ |
|---|---|---|
| 1 | หน้าตา UI ตามแบบ (ข้อมูลปลอม `web/src/data/mock.js`) | ✅ |
| 2 | Sync Item + Item Price + Item Group → MongoDB, API `/products`, `/categories` | ✅ |
| 3 | หน้าร้านแสดงสินค้าจริง (฿) + หน้า `/shop` ค้นหา `?q=` + กรองหมวด `?category=` | ✅ |
| 4 | หน้ารายละเอียดสินค้า `/product/[code]` + สินค้าที่เกี่ยวข้อง + หน้า 404 | ✅ |
| 5 | ตะกร้า (localStorage) + `/cart` Checkout → `POST /orders` → Customer + Address + Sales Order (Draft) + หน้า `/order/[token]` | ✅ |
| 6 | รีวิว + คะแนนเฉลี่ย (MongoDB) / Wishlist (localStorage) / Newsletter (MongoDB) | ✅ |
| 7 | Login: `/register` `/login` `/account` — session cookie (httpOnly) + argon2, สมัคร = Customer ใน ERPNext, ประวัติสั่งซื้อ + สถานะจริงจาก ERPNext | ✅ |

สร้างสินค้าตัวอย่างใน ERPNext (เขียนข้อมูลจริง!): `docker compose exec api python -m scripts.seed_items`

## คำสั่ง Docker ที่ใช้บ่อย (รันที่โฟลเดอร์ TestERP Connect)
| คำสั่ง | ทำอะไร |
|---|---|
| `docker compose up -d --build` | สร้าง + เปิดทุกกล่อง (เบื้องหลัง) |
| `docker compose ps` | ดูว่ากล่องไหนรันอยู่ |
| `docker compose logs -f api` | ดู log ของกล่อง api แบบสด |
| `docker compose down` | ปิดทุกกล่อง (ข้อมูลยังอยู่) |
| `docker compose down -v` | ปิด + **ลบข้อมูลใน volume ทิ้ง** |

## บทที่ 3: ERPNext ใน Docker
กล่องของ ERPNext (ขึ้นต้นด้วย `erp-`):
| กล่อง | หน้าที่ |
|---|---|
| `erp-db` | MariaDB ฐานข้อมูลของ ERPNext |
| `erp-redis-cache`, `erp-redis-queue` | cache + คิวงาน |
| `erp-configurator` | รันครั้งเดียว: เขียน config |
| `erp-create-site` | รันครั้งเดียว: สร้าง site `erp.localhost` |
| `erp-backend` | ตัวประมวลผลหลัก |
| `erp-frontend` | nginx หน้าเว็บ :8080 |
| `erp-websocket` | real-time |
| `erp-queue-short/long`, `erp-scheduler` | งานเบื้องหลัง / ตามเวลา |

**ตอนนี้ใช้ Frappe Cloud แทน** (`ERP_URL` ใน `.env`) → กล่องข้างบนพักไว้ใน profile `erp-local`
- เปิดตัวใน Docker: `docker compose --profile erp-local up -d` แล้วเปลี่ยน `ERP_URL=http://erp-frontend:8080`
- เช็กการสร้าง site: `docker compose logs -f erp-create-site`

### สร้าง API Key (Frappe Cloud)
1. เข้า https://pskant.s.frappe.cloud
2. รูปโปรไฟล์มุมขวาบน → **My Settings** → **View Full Profile** → แท็บ **Settings** → เลื่อนลงล่างสุด หัวข้อ **API Access** → **Generate Keys**
   (ต้องมี role **System Manager** ถึงจะเห็น ถ้าไม่เห็น → เข้าเป็น Administrator จาก Frappe Cloud dashboard)
3. API Secret แสดง **ครั้งเดียว** → ก๊อปทันที
4. ใส่ `.env` → `ERP_API_KEY`, `ERP_API_SECRET`
5. `docker compose up -d api` (ให้ api อ่านค่าใหม่)
6. Key จะมีสิทธิ์เท่ากับ user ที่สร้าง

> ERPNext v16 ใช้ URL `/desk/...` (เวอร์ชันเก่าเป็น `/app/...`)

## URL
- ERPNext: https://pskant.s.frappe.cloud (ตัวใน Docker: http://localhost:8080)
- เว็บ: http://localhost:3000
- API docs: http://localhost:8000/docs
- MongoDB (Compass): `mongodb://admin:<password>@localhost:27017/?authSource=admin`
