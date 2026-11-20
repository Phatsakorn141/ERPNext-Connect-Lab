// lib/shop.js — ดึงข้อมูลหน้าร้านจาก FastAPI (ใช้ใน Server Component เท่านั้น)
//
// Server Component ทำงานที่ server (เครื่องที่รัน npm run dev) → เรียก localhost:8000 ได้ตรงๆ
// API_URL ไม่มี NEXT_PUBLIC_ → browser มองไม่เห็นค่านี้

const API_URL = process.env.API_URL || "http://localhost:8000";

// GET จาก FastAPI  — error / API ปิดอยู่ → คืน null (ให้หน้าเว็บแสดงข้อความแทนที่จะพัง)
async function get(path) {
  try {
    const res = await fetch(API_URL + path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// รายการสินค้า  getProducts({ category: "Fashion", search: "bag", limit: 10 })
export async function getProducts({ category, search, limit = 24 } = {}) {
  // URLSearchParams = สร้าง ?category=...&search=... ให้ (แปลงอักขระพิเศษให้เอง)
  const params = new URLSearchParams({ limit: String(limit) });
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  return get(`/products?${params}`);
}

// สินค้า 1 ชิ้น — คืน { status, product }
//   status: "ok" = เจอ, "not_found" = ไม่มีสินค้านี้ (404), "error" = API ใช้ไม่ได้
// (แยก 2 กรณีหลังออกจากกัน: ไม่เจอ → หน้า 404, API ล่ม → ข้อความให้ลองใหม่)
export async function getProduct(code) {
  try {
    // encodeURIComponent: รหัสที่มีอักขระพิเศษ (เว้นวรรค, /) ใส่ใน URL ได้
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(code)}`);
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", product: await res.json() };
  } catch {
    return { status: "error" };
  }
}

// หมวดหมู่ — เอาเฉพาะหมวดที่มีสินค้า (ตัดหมวดเริ่มต้นของ ERPNext ที่ว่างอยู่ออก)
export async function getCategories() {
  const all = await get("/categories");
  return all && all.filter((c) => c.count > 0);
}

// คำสั่งซื้อ (หน้ายืนยัน) — คืน { status, order } แบบเดียวกับ getProduct
export async function getOrder(token) {
  try {
    const res = await fetch(`${API_URL}/orders/${encodeURIComponent(token)}`);
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", order: await res.json() };
  } catch {
    return { status: "error" };
  }
}

// รีวิวของสินค้า (ใหม่ → เก่า)
export async function getReviews(code) {
  return get(`/products/${encodeURIComponent(code)}/reviews`);
}

// รีวิวดีๆ ล่าสุด + คะแนนเฉลี่ยทั้งร้าน → { average, count, items }
export async function getLatestReviews(limit = 3) {
  return get(`/reviews/latest?limit=${limit}`);
}

// formatPrice ย้ายไป lib/format.js (ให้ Client Component ใช้ได้ด้วย) — export ต่อให้ไฟล์เดิมยังใช้ได้
export { formatPrice } from "./format";
