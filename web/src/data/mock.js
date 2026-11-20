// data/mock.js — ข้อมูลที่ยังเป็นของปลอม (ยังไม่มีใน ERPNext / MongoDB)
// สินค้าและหมวดหมู่ใช้ข้อมูลจริงแล้ว (lib/shop.js) — เหลือแค่ banner กับรีวิว
// เฟส 6: รีวิวจะย้ายไปเก็บใน MongoDB

// ---------- banner 3 ช่อง ----------
export const promos = [
  { tag: "New Arrivals", title: "Fresh Styles Just In", emoji: "👜", bg: "bg-mint", href: "/shop?category=Fashion" },
  { tag: "Home Refresh", title: "Make Your Space Better", emoji: "🛋️", bg: "bg-cream", href: "/shop?category=Home%20%26%20Living" },
  { tag: "Tech Essentials", title: "Upgrade Your Lifestyle", emoji: "⌚", bg: "bg-sky-50", href: "/shop?category=Electronics" },
];

// ---------- รีวิวจากลูกค้า (ตัวอย่าง) ----------
export const testimonials = [
  { name: "Sarah J.", text: "Amazing quality and fast delivery! This has become my go-to store for everything.", initial: "S" },
  { name: "Michael T.", text: "Great prices, nice selection and super easy returns. Highly recommended!", initial: "M" },
  { name: "Priya K.", text: "I love the variety they offer. I always find something I'm looking for.", initial: "P" },
];
