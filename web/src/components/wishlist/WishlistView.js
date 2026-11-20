// รายการสินค้าใน wishlist — Client Component (อ่านจาก localStorage)
"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import ProductGrid from "@/components/shop/ProductGrid";
import { useWishlist } from "@/lib/wishlist";

export default function WishlistView() {
  const { items, count } = useWishlist();

  if (count === 0) {
    return (
      <div className="space-y-4 rounded-3xl bg-cream p-12 text-center">
        <Heart className="mx-auto size-12 text-brand" />
        <h1 className="font-serif text-3xl text-brand">Your wishlist is empty</h1>
        <p className="text-zinc-500">Tap the ♡ on any product to save it here.</p>
        <Link href="/shop" className="inline-block rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-light">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="font-serif text-3xl text-brand">My Wishlist ({count})</h1>
      {/* ใช้ตารางสินค้าตัวเดียวกับหน้าร้าน (ราคาเป็นราคาตอนกดถูกใจ — ราคาจริงคิดตอนสั่งซื้อ) */}
      <ProductGrid products={items} />
    </section>
  );
}
