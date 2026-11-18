// app/layout.js — กรอบที่ครอบทุกหน้าในเว็บ
// ทุกหน้า (page.js) จะถูกใส่เข้ามาแทน {children}

import { Geist, Geist_Mono } from "next/font/google"; // โหลดฟอนต์จาก Google Fonts
import "./globals.css"; // CSS ทั้งเว็บ (รวม Tailwind)

// ฟอนต์ปกติ → ใช้ผ่าน CSS variable --font-geist-sans
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// ฟอนต์ตัวอักษรกว้างเท่ากัน (ไว้แสดงโค้ด) → --font-geist-mono
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ข้อมูลหน้าเว็บ: title = ชื่อบนแท็บ browser
export const metadata = {
  title: "TestERP Connect",
  description: "Next.js + FastAPI + MongoDB + ERPNext",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th" // บอก browser ว่าเนื้อหาเป็นภาษาไทย
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* children = เนื้อหาของหน้าที่เปิดอยู่ (เช่น page.js หรือ customers/page.js) */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
