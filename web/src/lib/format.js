// lib/format.js — จัดรูปแบบข้อความ (ใช้ได้ทั้ง Server และ Client Component)

// ราคา → "฿2,790"  (Intl.NumberFormat จัดรูปแบบตามสกุลเงิน + ใส่ลูกน้ำให้)
export function formatPrice(amount, currency = "THB") {
  if (amount == null) return "—"; // ยังไม่มีราคาใน ERPNext
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0, // 2790 → ฿2,790  (ไม่ต้องมี .00)
  }).format(amount);
}
