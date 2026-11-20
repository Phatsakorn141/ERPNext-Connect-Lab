// lib/localStore.js — "ที่เก็บรายการ" ใน localStorage ที่หลาย component ใช้ร่วมกันได้
// ใช้สร้างทั้งตะกร้า (lib/cart.js) และ wishlist (lib/wishlist.js) — เขียนครั้งเดียวใช้ 2 ที่
//
//   const store = createLocalStore("ชื่อ-key");
//   const items = store.useItems();   // ใน Client Component (วาดใหม่อัตโนมัติเมื่อเปลี่ยน)
//   store.save([...]);                // บันทึก + แจ้งทุก component
//
// ทำไมใช้ useSyncExternalStore?
//   ข้อมูลอยู่ "นอก React" (localStorage) และต้องใช้ร่วมกันหลายที่ (Header, ปุ่ม, หน้า)
//   → ทุก component "subscribe" ที่เดียวกัน เปลี่ยนที่หนึ่งทุกที่อัปเดตตาม
//   + เปิดหลายแท็บก็ sync กัน (event "storage")

"use client";

import { useSyncExternalStore } from "react";

const EMPTY = []; // ค่าว่างตัวเดียวกันเสมอ (React เทียบด้วย === )

export function createLocalStore(key) {
  let current = null; // รายการปัจจุบันในหน่วยความจำ (null = ยังไม่ได้โหลด)
  const listeners = new Set();

  // อ่านจาก localStorage (private mode / ข้อมูลเสีย → ว่าง)
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  // บันทึก + แจ้งทุก component ให้วาดใหม่
  function save(items) {
    current = items;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // บันทึกไม่ได้ก็ยังใช้ได้ในหน้านี้ (แค่ปิดแท็บแล้วหาย)
    }
    listeners.forEach((notify) => notify());
  }

  function subscribe(notify) {
    listeners.add(notify);
    const onStorage = (e) => {
      if (e.key === key) {
        current = load(); // แท็บอื่นแก้ → โหลดใหม่
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

  // ตอนสร้าง HTML ที่ server ยังไม่มี localStorage → ถือว่าว่าง
  function getServerSnapshot() {
    return EMPTY;
  }

  return {
    save,
    useItems: () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  };
}

// เก็บเฉพาะข้อมูลสินค้าที่ต้องใช้แสดงผล (ไม่เก็บทั้งก้อน)
export function productSnapshot(p) {
  return {
    code: p.code,
    item_name: p.item_name,
    price: p.price,
    currency: p.currency,
    item_group: p.item_group,
    image: p.image,
  };
}
