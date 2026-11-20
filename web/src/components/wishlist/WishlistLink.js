// ไอคอน Wishlist บน Header + จำนวน → กดแล้วไปหน้า /wishlist
"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";

export default function WishlistLink() {
  const { count } = useWishlist();

  return (
    <Link href="/wishlist" className="relative flex flex-col items-center gap-0.5 text-xs text-zinc-700 hover:text-brand">
      <Heart className="size-5" />
      <span className="hidden sm:block">Wishlist</span>
      <span className="absolute -top-1.5 right-0 grid size-4 place-items-center rounded-full bg-brand text-[10px] text-white sm:right-1">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
