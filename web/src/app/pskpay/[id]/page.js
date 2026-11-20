// app/pskpay/[id]/page.js — หน้าจ่ายเงินของ "PskPay" (gateway จำลอง)
// ของจริงหน้านี้อยู่บนเว็บของ gateway (เช่น checkout.stripe.com) ไม่ใช่เว็บร้าน
// จึงไม่มี Header ของร้าน และหน้าตาต่างจากร้าน
import { Suspense } from "react";
import PskPayCheckout from "@/components/payment/PskPayCheckout";

export const metadata = { title: "PskPay Checkout (Sandbox)" };

export default function PskPayPage({ params }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-900 px-4 py-10">
      <Suspense fallback={<div className="h-80 w-full max-w-sm animate-pulse rounded-2xl bg-slate-800" />}>
        {params.then(({ id }) => <PskPayCheckout id={id} />)}
      </Suspense>
    </main>
  );
}
