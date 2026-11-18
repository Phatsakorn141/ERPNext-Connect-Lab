// app/customers/page.js — หน้า /customers
// (App Router: โฟลเดอร์ customers + ไฟล์ page.js = URL /customers)
//
// ทำ 4 อย่าง:
//   1. แสดงรายชื่อลูกค้าจาก MongoDB      → GET  /customers
//   2. ค้นหาชื่อลูกค้า                    → GET  /customers?search=...
//   3. ปุ่ม Sync / Full Sync             → POST /sync/customers
//   4. ฟอร์มสร้างลูกค้าใหม่ใน ERPNext      → POST /erp/customers

"use client"; // หน้านี้ทำงานใน browser (มีปุ่ม, ฟอร์ม, state)

import Link from "next/link"; // ลิงก์ไปหน้าอื่นโดยไม่โหลดหน้าใหม่ทั้งหน้า
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api"; // @ = โฟลเดอร์ src/

export default function CustomersPage() {
  // ---------- state: ค่าที่เปลี่ยนแล้วหน้าจอวาดใหม่ให้เอง ----------
  const [customers, setCustomers] = useState([]); // รายชื่อลูกค้า
  const [status, setStatus] = useState(null); // สถานะ sync (จาก /sync/status)
  const [search, setSearch] = useState(""); // คำค้นหา
  const [error, setError] = useState(""); // ข้อความ error (กล่องแดง)
  const [message, setMessage] = useState(""); // ข้อความสำเร็จ (กล่องเขียว)
  const [busy, setBusy] = useState(false); // true = กำลังทำงาน → ปิดปุ่มกันกดซ้ำ

  // ฟอร์มสร้างลูกค้า
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Company");

  // ---------- โหลดรายชื่อจาก MongoDB (ผ่าน FastAPI GET /customers) ----------
  // useCallback = สร้างฟังก์ชันใหม่เฉพาะตอน search เปลี่ยน
  //   → useEffect ข้างล่างรู้ว่า "คำค้นเปลี่ยนแล้ว ต้องโหลดใหม่"
  const load = useCallback(async () => {
    try {
      // encodeURIComponent = แปลงภาษาไทย / เว้นวรรคให้ใส่ใน URL ได้
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      // Promise.all = ยิง 2 request พร้อมกัน แล้วรอให้เสร็จทั้งคู่ (เร็วกว่ายิงทีละอัน)
      const [list, st] = await Promise.all([
        api(`/customers${q}`),
        api("/sync/status"),
      ]);
      setCustomers(list);
      setStatus(st);
      setError("");
    } catch (e) {
      setError(`โหลดข้อมูลไม่ได้: ${e.message} (FastAPI รันอยู่ไหม?)`);
    }
  }, [search]);

  // ---------- โหลดใหม่เมื่อพิมพ์ค้นหา (รอ 300ms หลังหยุดพิมพ์) + รีเฟรชเองทุก 30 วินาที ----------
  // useEffect = ทำงานหลังหน้าจอวาดเสร็จ และทุกครั้งที่ค่าใน [ ] เปลี่ยน
  useEffect(() => {
    const t = setTimeout(load, 300); // ไม่ยิง API ทุกตัวอักษรที่พิมพ์
    const timer = setInterval(load, 30_000); // ดึงลูกค้าที่ auto-sync เพิ่งได้มา
    // return = cleanup: ยกเลิกตัวจับเวลาเก่าก่อนสร้างใหม่ / ตอนออกจากหน้า
    return () => {
      clearTimeout(t);
      clearInterval(timer);
    };
  }, [load]);

  // ---------- ปุ่ม Sync: POST /sync/customers ----------
  async function handleSync(full = false) {
    setBusy(true);
    setMessage("");
    try {
      const r = await api(`/sync/customers${full ? "?full=true" : ""}`, { method: "POST" });
      setMessage(`Sync เสร็จ: อัปเดต ${r.synced} ราย, ลบ ${r.deleted} ราย`);
      await load(); // โหลดรายชื่อใหม่ให้เห็นผล
    } catch (e) {
      setError(`Sync ไม่สำเร็จ: ${e.message}`);
    } finally {
      setBusy(false); // finally = ทำเสมอ ไม่ว่าสำเร็จหรือ error
    }
  }

  // ---------- ฟอร์ม: POST /erp/customers → สร้างใน ERPNext ----------
  async function handleCreate(e) {
    e.preventDefault(); // กันหน้าเว็บรีโหลดตอนกด submit
    setBusy(true);
    setMessage("");
    try {
      const r = await api("/erp/customers", {
        method: "POST",
        // แปลง object เป็น JSON string ส่งไปใน body
        body: JSON.stringify({ customer_name: newName, customer_type: newType }),
      });
      setMessage(`สร้างลูกค้า "${r.customer_name}" ใน ERPNext แล้ว`);
      setNewName(""); // ล้างช่องกรอก
      await load();
    } catch (e) {
      setError(`สร้างไม่สำเร็จ: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------- หน้าตา (JSX) ----------
  // className = class ของ Tailwind เช่น p-6 (padding), rounded-lg (มุมมน)
  return (
    <main className="mx-auto w-full max-w-4xl p-6 space-y-6">
      {/* หัวข้อ + ปุ่ม Sync */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">← หน้าแรก</Link>
          <h1 className="text-2xl font-semibold">ลูกค้า</h1>
          {/* status && (...) = แสดงเฉพาะตอนโหลด status มาแล้ว */}
          {status && (
            <p className="text-sm text-zinc-500">
              ใน MongoDB {status.customers_in_mongo} ราย · sync ล่าสุด{" "}
              {/* แปลงเวลา UTC เป็นเวลาไทย */}
              {status.synced_at ? new Date(status.synced_at).toLocaleString("th-TH") : "ยังไม่เคย"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* () => handleSync(false) = ส่งค่าเข้าฟังก์ชันตอนกด (ไม่ใช่เรียกทันที) */}
          <button onClick={() => handleSync(false)} disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
            Sync ตอนนี้
          </button>
          <button onClick={() => handleSync(true)} disabled={busy}
            className="rounded-lg border px-4 py-2 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800">
            Full Sync
          </button>
        </div>
      </div>

      {/* ข้อความแจ้งผล / error (แสดงเฉพาะตอนมีข้อความ) */}
      {message && <p className="rounded-lg bg-green-100 p-3 text-green-800">{message}</p>}
      {error && <p className="rounded-lg bg-red-100 p-3 text-red-800">{error}</p>}

      {/* ฟอร์มสร้างลูกค้า: กด Enter หรือปุ่ม submit → handleCreate */}
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 rounded-lg border p-4">
        {/* value + onChange = "controlled input": ค่าในช่อง = state newName เสมอ */}
        {/* required = browser ไม่ยอมให้ส่งถ้าช่องว่าง */}
        <input value={newName} onChange={(e) => setNewName(e.target.value)} required
          placeholder="ชื่อลูกค้าใหม่" className="flex-1 rounded-lg border px-3 py-2" />
        <select value={newType} onChange={(e) => setNewType(e.target.value)}
          className="rounded-lg border px-3 py-2">
          <option value="Company">Company</option>
          <option value="Individual">Individual</option>
        </select>
        <button type="submit" disabled={busy}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
          สร้างใน ERPNext
        </button>
      </form>

      {/* ค้นหา: พิมพ์ → search เปลี่ยน → load ใหม่ → useEffect โหลดข้อมูลใหม่ */}
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="ค้นหาชื่อลูกค้า..." className="w-full rounded-lg border px-3 py-2" />

      {/* ตารางลูกค้า */}
      <table className="w-full text-left">
        <thead className="border-b text-sm text-zinc-500">
          <tr>
            <th className="py-2">ชื่อ</th>
            <th>ประเภท</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {/* map = วนสร้าง 1 แถวต่อลูกค้า 1 ราย, key = ตัวระบุที่ไม่ซ้ำ (React ต้องการ) */}
          {customers.map((c) => (
            <tr key={c.name} className="border-b">
              <td className="py-2">{c.customer_name}</td>
              <td>{c.customer_type}</td>
              <td>{c.disabled ? "ปิดใช้งาน" : "ใช้งาน"}</td>
            </tr>
          ))}
          {/* ไม่มีข้อมูล → แสดงข้อความแทน */}
          {customers.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-zinc-500">ไม่พบลูกค้า</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
