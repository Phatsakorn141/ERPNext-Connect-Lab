// app/page.js — หน้าแรก (URL: /)
// ไม่มี "use client" → เป็น Server Component (สร้าง HTML ที่ server ส่งให้ browser)
// ใช้ได้เพราะหน้านี้ไม่มีปุ่ม/state อะไร มีแค่ลิงก์

import Link from "next/link"; // ลิงก์ภายในเว็บ (เปลี่ยนหน้าไม่ต้องโหลดใหม่ทั้งหน้า)

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">TestERP Connect</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Next.js → FastAPI → MongoDB / ERPNext
      </p>

      <ul className="space-y-2">
        <li>
          {/* หน้าภายในเว็บ → ใช้ <Link> */}
          <Link href="/customers" className="text-blue-600 hover:underline">
            ลูกค้า
          </Link>{" "}
          — รายชื่อจาก MongoDB, Sync, สร้างลูกค้าใน ERPNext
        </li>
        <li>
          {/* เว็บอื่น (คนละ port) → ใช้ <a> ธรรมดา */}
          <a href="http://localhost:8000/docs" className="text-blue-600 hover:underline">
            API Docs (FastAPI)
          </a>
        </li>
      </ul>
    </main>
  );
}
