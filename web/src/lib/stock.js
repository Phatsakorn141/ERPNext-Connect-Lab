// lib/stock.js — แปลง stock_qty (จาก API) เป็นข้อมูลสำหรับแสดงผล
// ใช้ได้ทั้ง Server และ Client Component (ฟังก์ชันธรรมดา ไม่มี state)
//
// stock_qty ไม่มีค่า = สินค้าไม่นับสต็อกใน ERPNext → ขายได้ไม่จำกัด

export const LOW_STOCK = 5; // เหลือไม่เกินนี้ → เตือน "Only N left"

export function stockInfo(product) {
  const qty = product.stock_qty;
  if (qty == null) return { inStock: true, low: false, max: 99, label: null };
  if (qty <= 0) return { inStock: false, low: false, max: 0, label: "Out of stock" };
  const low = qty <= LOW_STOCK;
  return { inStock: true, low, max: Math.min(99, qty), label: low ? `Only ${qty} left` : "In stock" };
}
