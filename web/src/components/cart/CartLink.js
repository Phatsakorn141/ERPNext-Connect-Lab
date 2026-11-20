// ไอคอนตะกร้าบน Header + ตัวเลขจำนวนชิ้น → กดแล้วไปหน้า /cart
"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

export default function CartLink() {
  const { count } = useCart();

  return (
    <Link href="/cart" className="relative flex flex-col items-center gap-0.5 text-xs text-zinc-700 hover:text-brand">
      <ShoppingCart className="size-5" />
      <span className="hidden sm:block">Cart</span>
      <span className="absolute -top-1.5 right-0 grid size-4 place-items-center rounded-full bg-brand text-[10px] text-white sm:right-1">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
