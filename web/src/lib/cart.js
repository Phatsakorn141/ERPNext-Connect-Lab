// lib/cart.js — ตะกร้าสินค้า (เก็บใน localStorage ผ่าน lib/localStore.js)
//
// ใช้ใน Client Component:
//   const cart = useCart();
//   cart.items / cart.count / cart.subtotal
//   cart.add(product) / cart.setQty(code, 3) / cart.remove(code) / cart.clear()

"use client";

import { createLocalStore, productSnapshot } from "./localStore";
import { stockInfo } from "./stock";

const store = createLocalStore("pskant-cart");

export function useCart() {
  const items = store.useItems();

  return {
    items,
    count: items.reduce((sum, i) => sum + i.qty, 0),
    subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),

    // เพิ่มสินค้า (มีอยู่แล้ว → บวกจำนวน, สูงสุด = สต็อกหรือ 99)
    // ข้อมูลสินค้าล่าสุด (product) ทับ snapshot เดิม → stock_qty ใหม่ล่าสุดเสมอ
    add(product, qty = 1) {
      const max = stockInfo(product).max;
      const found = items.find((i) => i.code === product.code);
      store.save(
        found
          ? items.map((i) => (i.code === product.code
            ? { ...productSnapshot(product), qty: Math.min(max, i.qty + qty) } : i))
          : [...items, { ...productSnapshot(product), qty: Math.min(max, qty) }],
      );
    },

    // ตั้งจำนวน (0 หรือน้อยกว่า = ลบออก)
    setQty(code, qty) {
      store.save(
        qty <= 0
          ? items.filter((i) => i.code !== code)
          : items.map((i) => (i.code === code ? { ...i, qty: Math.min(stockInfo(i).max || 99, qty) } : i)),
      );
    },

    remove(code) {
      store.save(items.filter((i) => i.code !== code));
    },

    clear() {
      store.save([]);
    },
  };
}
