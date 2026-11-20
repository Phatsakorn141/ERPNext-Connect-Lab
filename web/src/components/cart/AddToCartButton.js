// ปุ่ม "ใส่ตะกร้า" — Client Component (ต้องกดได้ + ใช้ localStorage)
// ใช้ได้ใน Server Component (ProductCard, หน้าสินค้า) — Next.js ส่งแค่ปุ่มนี้ไปทำงานใน browser
"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

// product: { code, item_name, price, currency, item_group, image }
// variant: "icon" = ปุ่มกลมเล็ก (การ์ดสินค้า), "full" = ปุ่มใหญ่มีข้อความ (หน้าสินค้า)
export default function AddToCartButton({ product, variant = "icon" }) {
  const cart = useCart();
  const [added, setAdded] = useState(false); // โชว์ ✓ แป๊บหนึ่งหลังกด

  const disabled = product.price == null; // ไม่มีราคา → ขายไม่ได้

  function handleClick() {
    cart.add(product); // cart.add เลือกเก็บเฉพาะ field ที่ใช้เอง (productSnapshot)
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const Icon = added ? Check : ShoppingCart;

  if (variant === "full") {
    return (
      <button onClick={handleClick} disabled={disabled}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-medium text-white hover:bg-brand-light disabled:opacity-50 md:w-fit">
        <Icon className="size-5" /> {added ? "Added to Cart" : "Add to Cart"}
      </button>
    );
  }

  return (
    <button onClick={handleClick} disabled={disabled} aria-label={`Add ${product.item_name} to cart`}
      className="grid size-8 place-items-center rounded-full bg-brand text-white hover:bg-brand-light disabled:opacity-50">
      <Icon className="size-4" />
    </button>
  );
}
