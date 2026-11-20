// lib/api.js — ตัวช่วยเรียก FastAPI จาก browser
//
// ใช้แบบนี้:
//   const list = await api("/customers");                          // GET
//   await api("/sync/customers", { method: "POST" });              // POST
//   await api("/erp/customers", { method: "POST", body: JSON.stringify({...}) });

// NEXT_PUBLIC_ = ให้ browser อ่านค่านี้ได้ (ห้ามใส่ความลับในตัวแปรแบบนี้)
// ไม่ได้ตั้งไว้ใน web/.env.local → ใช้ http://localhost:8000
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function api(path, options = {}) {
  // fetch = ฟังก์ชันส่ง HTTP request ที่มีใน browser อยู่แล้ว
  const res = await fetch(API_URL + path, {
    headers: { "Content-Type": "application/json" }, // บอก API ว่า body เป็น JSON
    // ส่ง cookie (session login) ไปกับ request ด้วย — API อยู่คนละ port ต้องสั่งเอง
    credentials: "include",
    ...options, // method, body ฯลฯ ที่ส่งมา (เขียนทับค่าข้างบนได้)
  });

  // แปลง response เป็น object  (.catch → ถ้าไม่ใช่ JSON ให้เป็น null แทนที่จะพัง)
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // res.ok = false เมื่อ status 400 ขึ้นไป
    // FastAPI ส่ง error มาใน "detail" (เป็น string หรือ list ของ error จาก Pydantic)
    const detail = data?.detail; // ?. = ถ้า data เป็น null ไม่พัง ได้ undefined
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(", ") // 422 จาก Pydantic → รวมข้อความทุกตัว
      : detail || `HTTP ${res.status}`; // error ทั่วไป
    throw new Error(message); // โยน error ให้คนเรียกจับด้วย try/catch
  }
  return data;
}
