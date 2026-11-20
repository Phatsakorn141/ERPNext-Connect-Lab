// หน้าตะกร้า + ฟอร์มสั่งซื้อ — Client Component (ใช้ตะกร้าใน localStorage + ส่งฟอร์ม)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { categoryStyle } from "@/lib/categoryStyle";
import { formatPrice } from "@/lib/format";

// ช่องในฟอร์ม: [ชื่อ field, label, type, placeholder]
const FIELDS = [
  ["name", "Full name", "text", "Somchai Jaidee"],
  ["email", "Email", "email", "you@example.com"],
  ["phone", "Phone", "tel", "0812345678"],
  ["address", "Address", "text", "123 Sukhumvit Rd"],
  ["city", "City / Province", "text", "Bangkok"],
];

export default function CartView() {
  const cart = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ---------- ตะกร้าว่าง ----------
  if (cart.items.length === 0) {
    return (
      <div className="space-y-4 rounded-3xl bg-cream p-12 text-center">
        <ShoppingBag className="mx-auto size-12 text-brand" />
        <h1 className="font-serif text-3xl text-brand">Your cart is empty</h1>
        <Link href="/shop" className="inline-block rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-light">
          Start Shopping
        </Link>
      </div>
    );
  }

  // ---------- ส่งคำสั่งซื้อ: POST /orders ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          customer: form,
          // ส่งแค่รหัส + จำนวน ไม่ส่งราคา (API คิดราคาเองจาก MongoDB — กันคนแก้ราคาใน browser)
          items: cart.items.map((i) => ({ code: i.code, qty: i.qty })),
        }),
      });
      cart.clear();
      router.push(`/order/${result.token}`); // ไปหน้ายืนยัน
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      {/* ==================== ซ้าย: รายการในตะกร้า ==================== */}
      <section className="space-y-4">
        <h1 className="font-serif text-3xl text-brand">Shopping Cart ({cart.count})</h1>
        <ul className="divide-y rounded-2xl border border-zinc-200">
          {cart.items.map((item) => {
            const style = categoryStyle(item.item_group);
            return (
              <li key={item.code} className="flex items-center gap-4 p-4">
                {/* รูป / emoji */}
                <Link href={`/product/${encodeURIComponent(item.code)}`}
                  className={`grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl text-4xl ${style.bg}`}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="size-full object-cover" />
                  ) : (
                    <span aria-hidden>{style.emoji}</span>
                  )}
                </Link>

                {/* ชื่อ + ราคาต่อชิ้น + ปุ่มจำนวน */}
                <div className="min-w-0 flex-1 space-y-2">
                  <Link href={`/product/${encodeURIComponent(item.code)}`} className="line-clamp-2 font-medium hover:text-brand">
                    {item.item_name}
                  </Link>
                  <p className="text-sm text-zinc-500">{formatPrice(item.price, item.currency)} each</p>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Decrease" onClick={() => cart.setQty(item.code, item.qty - 1)}
                      className="grid size-7 place-items-center rounded-full border hover:border-brand">
                      <Minus className="size-3" />
                    </button>
                    <span className="w-6 text-center text-sm" aria-live="polite">{item.qty}</span>
                    <button type="button" aria-label="Increase" onClick={() => cart.setQty(item.code, item.qty + 1)}
                      className="grid size-7 place-items-center rounded-full border hover:border-brand">
                      <Plus className="size-3" />
                    </button>
                    <button type="button" aria-label={`Remove ${item.item_name}`} onClick={() => cart.remove(item.code)}
                      className="ml-2 text-zinc-400 hover:text-sale">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* ราคารวมของแถว */}
                <p className="font-semibold">{formatPrice(item.price * item.qty, item.currency)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ==================== ขวา: สรุปยอด + ฟอร์มสั่งซื้อ ==================== */}
      <aside className="h-fit space-y-5 rounded-2xl bg-cream p-6">
        <h2 className="text-lg font-semibold">Order Summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd className="text-brand">Free</dd></div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt><dd>{formatPrice(cart.subtotal)}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit} className="space-y-3">
          <h3 className="pt-2 font-semibold">Shipping Details</h3>
          {FIELDS.map(([field, label, type, placeholder]) => (
            <label key={field} className="block text-sm">
              <span className="text-zinc-600">{label}</span>
              <input type={type} required placeholder={placeholder} value={form[field]}
                // [field]: ... = แก้เฉพาะช่องนี้ ช่องอื่นคงเดิม
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-brand" />
            </label>
          ))}

          {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full rounded-xl bg-brand py-3 font-medium text-white hover:bg-brand-light disabled:opacity-50">
            {busy ? "Placing order..." : "Place Order"}
          </button>
          <p className="text-center text-xs text-zinc-500">Pay on delivery · Final total is confirmed by our team</p>
        </form>
      </aside>
    </div>
  );
}
