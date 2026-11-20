// lib/cart.js — ตะกร้าสินค้า (เก็บใน localStorage ของ browser)
//
// ใช้ใน Client Component:
//   const cart = useCart();
//   cart.items / cart.count / cart.subtotal
//   cart.add(product) / cart.setQty(code, 3) / cart.remove(code) / cart.clear()
//
// ทำไมไม่ใช้ useState ธรรมดา?
//   ตะกร้าต้องใช้ร่วมกันหลายที่ (ตัวเลขบน Header, ปุ่ม Add to Cart, หน้า /cart)
//   → เก็บไว้ที่เดียว (store) แล้วทุก component "subscribe" ด้วย useSyncExternalStore
//   เปลี่ยนที่หนึ่ง ทุกที่อัปเดตตาม + เปิดหลายแท็บก็ sync กัน (event "storage")

"use client";

import { useSyncExternalStore } from "react";

const KEY = "pskant-cart"; // ชื่อที่เก็บใน localStorage
const EMPTY = [];          // ค่าว่างตัวเดียวกันเสมอ (React เทียบด้วย === )

let current = null;        // ตะกร้าปัจจุบันในหน่วยความจำ (null = ยังไม่ได้โหลด)
const listeners = new Set();

// อ่านจาก localStorage (เปิด private mode / ข้อมูลเสีย → ตะกร้าว่าง)
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value : EMPTY;
  } catch {
    return EMPTY;
  }
}

// บันทึก + แจ้งทุก component ที่ subscribe อยู่ให้วาดใหม่
function save(items) {
  current = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // บันทึกไม่ได้ก็ยังใช้งานได้ในหน้านี้ (แค่ปิดแท็บแล้วหาย)
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify) {
  listeners.add(notify);
  // แท็บอื่นแก้ตะกร้า → โหลดใหม่
  const onStorage = (e) => {
    if (e.key === KEY) {
      current = load();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (current === null) current = load();
  return current;
}

// ตอนสร้าง HTML ที่ server ยังไม่มี localStorage → ถือว่าตะกร้าว่าง
function getServerSnapshot() {
  return EMPTY;
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    items,
    count: items.reduce((sum, i) => sum + i.qty, 0),
    subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),

    // เพิ่มสินค้า (มีอยู่แล้ว → บวกจำนวน, สูงสุด 99)
    add(product, qty = 1) {
      const found = items.find((i) => i.code === product.code);
      save(
        found
          ? items.map((i) => (i.code === product.code ? { ...i, qty: Math.min(99, i.qty + qty) } : i))
          : [...items, { ...product, qty }],
      );
    },

    // ตั้งจำนวน (0 หรือน้อยกว่า = ลบออก)
    setQty(code, qty) {
      save(qty <= 0 ? items.filter((i) => i.code !== code) : items.map((i) => (i.code === code ? { ...i, qty: Math.min(99, qty) } : i)));
    },

    remove(code) {
      save(items.filter((i) => i.code !== code));
    },

    clear() {
      save([]);
    },
  };
}
