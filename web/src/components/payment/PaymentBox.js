// กล่องชำระเงินในหน้าคำสั่งซื้อ — Client Component (มีปุ่ม + รีเฟรชรอผล)
//
// payment.status (จาก API):
//   ไม่มี / "unpaid" → ยังไม่จ่าย          "pending" → ไปหน้า gateway แล้ว รอผล
//   "paid"           → จ่ายแล้ว            "failed"  → จ่ายไม่ผ่าน (ลองใหม่ได้)
//   "review"         → ยอดไม่ตรง รอพนักงานตรวจ
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CreditCard, LoaderCircle, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";

const REFRESH_EVERY = 2000; // ms
const MAX_REFRESH = 15;     // รอไม่เกิน ~30 วินาที แล้วหยุด (ไม่รีเฟรชไปตลอด)

export default function PaymentBox({ token, payment, total, currency }) {
  const status = payment?.status || "unpaid";
  // จ่ายแล้วแต่ยังลงบัญชี ERPNext ไม่เสร็จ (ยังไม่มี Payment Entry)
  const posting = status === "paid" && !payment.payment_entry && !payment.error;

  // รอ webhook → ขอข้อมูลหน้าใหม่จาก server ทุก 2 วินาที
  useAutoRefresh(status === "pending" || posting);

  if (status === "paid") {
    return (
      <div className="space-y-2 rounded-2xl bg-green-50 p-5 text-sm text-green-900">
        <p className="flex items-center gap-2 text-base font-semibold"><CircleCheck className="size-5" /> Paid {formatPrice(total, currency)}</p>
        <p>Payment ref: <span className="font-mono">{payment.payment_id}</span></p>
        {payment.invoice && <p>Invoice: <span className="font-mono">{payment.invoice}</span></p>}
        {posting && <p className="flex items-center gap-2 text-green-700"><LoaderCircle className="size-4 animate-spin" /> Recording payment…</p>}
      </div>
    );
  }

  if (status === "review") {
    return (
      <p className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">
        We received your payment and our team is checking it. We will contact you soon.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 p-5 text-center">
      {status === "failed" && (
        <p className="flex items-center justify-center gap-2 text-sm text-sale"><TriangleAlert className="size-4" /> Payment failed. Please try again.</p>
      )}
      {status === "pending" && (
        <p className="flex items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="size-4 animate-spin" /> Waiting for payment confirmation…</p>
      )}
      <PayButton token={token} label={`Pay ${formatPrice(total, currency)} Now`} />
      <p className="text-xs text-zinc-500">or pay on delivery — our team will confirm your order.</p>
    </div>
  );
}

function PayButton({ token, label }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      // API ขอ session จาก gateway (ยอดเงินคิดที่ server) แล้วคืนลิงก์หน้าจ่ายเงิน
      const { checkout_url } = await api(`/payments/${token}/checkout`, { method: "POST" });
      window.location.href = checkout_url; // ออกจากเว็บเราไปหน้า gateway
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={handleClick} disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-medium text-white hover:bg-brand-light disabled:opacity-50">
        <CreditCard className="size-5" /> {busy ? "Redirecting…" : label}
      </button>
      {error && <p className="text-sm text-sale">{error}</p>}
    </>
  );
}

// เรียก router.refresh() เป็นระยะ → Server Component ดึงข้อมูลออเดอร์ใหม่ (ไม่ต้องโหลดทั้งหน้า)
function useAutoRefresh(active) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= MAX_REFRESH) clearInterval(id);
    }, REFRESH_EVERY);
    return () => clearInterval(id);
  }, [active, router]);
}
