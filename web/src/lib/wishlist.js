// lib/wishlist.js — สินค้าที่ถูกใจ ❤️ (เก็บใน localStorage ผ่าน lib/localStore.js)
//
// ทำไมไม่เก็บใน MongoDB?  ร้านยังไม่มีระบบ login → ไม่รู้ว่า "ใคร" เป็นเจ้าของ wishlist
// เก็บใน browser ของแต่ละคนไปก่อน (มี login เมื่อไหร่ค่อยย้ายไป MongoDB)
//
//   const wishlist = useWishlist();
//   wishlist.items / wishlist.count / wishlist.has(code) / wishlist.toggle(product)

"use client";

import { createLocalStore, productSnapshot } from "./localStore";

const store = createLocalStore("pskant-wishlist");

export function useWishlist() {
  const items = store.useItems();

  return {
    items,
    count: items.length,
    has: (code) => items.some((i) => i.code === code),

    // มีแล้ว → เอาออก, ยังไม่มี → เพิ่ม (ใหม่สุดอยู่บน)
    toggle(product) {
      store.save(
        items.some((i) => i.code === product.code)
          ? items.filter((i) => i.code !== product.code)
          : [productSnapshot(product), ...items],
      );
    },
  };
}
