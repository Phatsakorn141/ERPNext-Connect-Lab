// หน้าบัญชีของฉัน — Client Component (ข้อมูลผู้ใช้มาจาก cookie session → ต้องถามใน browser)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Package, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { logout, useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

// สีป้ายสถานะ (สถานะของ Sales Order ใน ERPNext)
const STATUS_STYLE = {
  Draft: "bg-zinc-100 text-zinc-700",
  "To Deliver and Bill": "bg-amber-100 text-amber-800",
  "To Bill": "bg-sky-100 text-sky-800",
  "To Deliver": "bg-sky-100 text-sky-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-700",
};

export default function AccountView() {
  const { status, user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState(null); // null = กำลังโหลด
  const [error, setError] = useState("");

  // login แล้ว → โหลดประวัติสั่งซื้อ (GET /account/orders)
  useEffect(() => {
    if (status !== "user") return;
    let cancelled = false; // ออกจากหน้าก่อนโหลดเสร็จ → ไม่ต้อง set state
    api("/account/orders")
      .then((data) => !cancelled && setOrders(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (status === "loading") {
    return <div className="h-64 animate-pulse rounded-3xl bg-zinc-100" />;
  }

  // ยังไม่ login → ชวนไป login (แล้วกลับมาหน้านี้)
  if (status === "guest") {
    return (
      <div className="space-y-4 rounded-3xl bg-cream p-12 text-center">
        <UserRound className="mx-auto size-12 text-brand" />
        <h1 className="font-serif text-3xl text-brand">Please log in</h1>
        <p className="text-zinc-500">Log in to see your account and order history.</p>
        <div className="flex justify-center gap-3">
          <Link href="/login?next=/account" className="rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-light">Log In</Link>
          <Link href="/register?next=/account" className="rounded-lg border border-brand px-6 py-3 text-sm font-medium text-brand hover:bg-mint">Create Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
      {/* ---------- โปรไฟล์ ---------- */}
      <aside className="h-fit space-y-4 rounded-2xl bg-cream p-6">
        <span className="grid size-16 place-items-center rounded-full bg-brand text-2xl font-semibold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="font-serif text-2xl text-brand">{user.name}</h1>
          <p className="text-sm text-zinc-600">{user.email}</p>
        </div>
        {/* Customer ใน ERPNext ที่ผูกกับบัญชีนี้ */}
        <p className="text-xs text-zinc-500">ERPNext Customer: <span className="font-mono">{user.customer}</span></p>
        <button onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:border-sale hover:text-sale">
          <LogOut className="size-4" /> Log Out
        </button>
      </aside>

      {/* ---------- ประวัติสั่งซื้อ ---------- */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Package className="size-5" /> My Orders</h2>

        {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
        {orders === null && !error && <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />}
        {orders?.length === 0 && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-zinc-500">
            No orders yet. <Link href="/shop" className="text-brand underline">Start shopping</Link>
          </p>
        )}

        {orders?.length > 0 && (
          <ul className="divide-y rounded-2xl border border-zinc-200">
            {orders.map((o) => (
              <li key={o.token}>
                <Link href={`/order/${o.token}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-zinc-50">
                  <span className="font-mono text-sm font-medium">{o.order_no}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[o.status] || "bg-zinc-100"}`}>{o.status}</span>
                  <span className="text-sm text-zinc-500">{new Date(o.created_at).toLocaleDateString("th-TH")}</span>
                  <span className="text-sm text-zinc-500">{o.items_count} items</span>
                  {o.payment_status === "paid" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Paid</span>}
                  <span className="ml-auto font-semibold">{formatPrice(o.grand_total, o.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-400">Status is updated live from ERPNext.</p>
      </section>
    </div>
  );
}
