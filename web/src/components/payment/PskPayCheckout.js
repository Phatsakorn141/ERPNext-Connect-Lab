// หน้าจ่ายเงินของ PskPay (gateway จำลอง) — Client Component
// ไม่มีช่องกรอกบัตรจริง: กด "จ่ายสำเร็จ" หรือ "จำลองว่าล้มเหลว" เพื่อทดสอบทั้ง 2 กรณี
"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export default function PskPayCheckout({ id }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/mockpay/sessions/${encodeURIComponent(id)}`).then(setSession).catch((e) => setError(e.message));
  }, [id]);

  async function complete(result) {
    setBusy(true);
    try {
      // gateway บันทึกผล → ส่ง webhook หาร้าน (เบื้องหลัง) → ตอบที่อยู่สำหรับพาลูกค้ากลับร้าน
      const { redirect_url } = await api(`/mockpay/sessions/${encodeURIComponent(id)}/complete`, {
        method: "POST",
        body: JSON.stringify({ result }),
      });
      window.location.href = redirect_url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (error) return <p className="rounded-2xl bg-white p-6 text-sm text-red-700">{error}</p>;
  if (!session) return <div className="h-80 w-full max-w-sm animate-pulse rounded-2xl bg-slate-800" />;

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600">PskPay</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">SANDBOX</span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-slate-500">Pay {session.merchant}</p>
        <p className="text-3xl font-semibold text-slate-900">{formatPrice(session.amount, session.currency)}</p>
        <p className="text-xs text-slate-500">{session.description}</p>
      </div>

      {session.status === "paid" ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">This payment is already completed.</p>
      ) : (
        <div className="space-y-2">
          <button onClick={() => complete("paid")} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            <LockKeyhole className="size-4" /> Pay {formatPrice(session.amount, session.currency)}
          </button>
          <button onClick={() => complete("failed")} disabled={busy}
            className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Simulate failed payment
          </button>
        </div>
      )}
      <p className="text-center text-xs text-slate-400">Test mode — no real money is charged.</p>
    </div>
  );
}
