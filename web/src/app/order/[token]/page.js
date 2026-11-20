// app/order/[token]/page.js — หน้ายืนยันคำสั่งซื้อ (URL: /order/<token สุ่ม>)
// ข้อมูลอ่านจาก MongoDB (API เก็บไว้ตอนสร้าง Sales Order ใน ERPNext)

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import Header from "@/components/shop/Header";
import FeatureBar from "@/components/shop/FeatureBar";
import { ApiError } from "@/components/shop/ProductGrid";
import PaymentBox from "@/components/payment/PaymentBox";
import { formatPrice, getOrder } from "@/lib/shop";

export const metadata = { title: "Order Confirmed — Pskant Shop" };

export default function OrderPage({ params }) {
  return (
    <>
      <Header active="" />
      <main className="mx-auto w-full max-w-3xl space-y-12 px-4 py-10">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-zinc-100" />}>
          {params.then(({ token }) => <OrderDetail token={token} />)}
        </Suspense>
        <FeatureBar />
      </main>
    </>
  );
}

async function OrderDetail({ token }) {
  const { status, order } = await getOrder(token);
  if (status === "not_found") notFound();
  if (status === "error") return <ApiError what="your order" />;

  return (
    <section className="space-y-6 rounded-3xl border border-zinc-200 p-6 md:p-10">
      <div className="space-y-2 text-center">
        <CircleCheck className="mx-auto size-14 text-brand" />
        <h1 className="font-serif text-3xl text-brand">Thank you, {order.customer_name}!</h1>
        <p className="text-zinc-600">Your order has been received.</p>
      </div>

      {/* order_no = เลขที่ Sales Order ใน ERPNext */}
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-cream p-4 text-sm sm:grid-cols-3">
        <div><dt className="text-zinc-500">Order No.</dt><dd className="font-mono font-medium">{order.order_no}</dd></div>
        <div><dt className="text-zinc-500">Status</dt><dd>{order.status}</dd></div>
        <div><dt className="text-zinc-500">Delivery by</dt><dd>{new Date(order.delivery_date).toLocaleDateString("th-TH")}</dd></div>
      </dl>

      <table className="w-full text-sm">
        <thead className="border-b text-left text-zinc-500">
          <tr><th className="py-2">Item</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.code} className="border-b">
              <td className="py-2">{i.item_name}</td>
              <td className="text-right">{i.qty}</td>
              <td className="text-right">{formatPrice(i.amount, order.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            {/* grand_total = ยอดที่ ERPNext คำนวณ */}
            <td className="pt-3" colSpan={2}>Total</td>
            <td className="pt-3 text-right">{formatPrice(order.grand_total, order.currency)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ชำระเงิน (Client Component): ปุ่มจ่าย / รอผล / จ่ายแล้ว */}
      <PaymentBox token={token} payment={order.payment} total={order.grand_total} currency={order.currency} />
      <div className="text-center">
        <Link href="/shop" className="inline-block rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-light">
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}
