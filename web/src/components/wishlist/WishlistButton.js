// ปุ่มหัวใจ ❤️ — กดเพื่อเพิ่ม/เอาออกจาก wishlist
"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";

// variant: "icon" = ปุ่มกลมลอยบนรูป (การ์ดสินค้า), "full" = ปุ่มมีข้อความ (หน้าสินค้า)
export default function WishlistButton({ product, variant = "icon", className = "" }) {
  const wishlist = useWishlist();
  const saved = wishlist.has(product.code);
  const label = saved ? `Remove ${product.item_name} from wishlist` : `Add ${product.item_name} to wishlist`;

  // หัวใจทึบสีแดง = อยู่ใน wishlist แล้ว
  const heart = <Heart className={`size-5 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />;

  if (variant === "full") {
    return (
      <button type="button" onClick={() => wishlist.toggle(product)} aria-pressed={saved}
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 font-medium hover:border-brand md:w-fit">
        {heart} {saved ? "Saved" : "Wishlist"}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => wishlist.toggle(product)} aria-label={label} aria-pressed={saved}
      className={`grid size-9 place-items-center rounded-full bg-white/90 text-zinc-600 shadow-sm hover:text-rose-500 ${className}`}>
      {heart}
    </button>
  );
}
