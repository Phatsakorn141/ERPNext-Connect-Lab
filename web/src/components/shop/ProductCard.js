// การ์ดสินค้า 1 ชิ้น: รูป, ปุ่มหัวใจ, หมวด, ชื่อ, ดาวรีวิว, ราคา, ปุ่มใส่ตะกร้า
// product มาจาก FastAPI GET /products:
//   { code, item_name, item_group, price, currency, image, rating_avg, rating_count, ... }
// ใช้ได้ทั้งใน Server Component (หน้าร้าน) และ Client Component (หน้า wishlist)
import Link from "next/link";
import { Star } from "lucide-react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { categoryStyle } from "@/lib/categoryStyle";
import { formatPrice } from "@/lib/format";

// ดาว 5 ดวง: เต็มตามคะแนน (ปัดเศษ) ที่เหลือเป็นดาวเทา
export function Stars({ rating, className = "size-3.5" }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n}
          className={`${className} ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
      ))}
    </span>
  );
}

export default function ProductCard({ product: p }) {
  const style = categoryStyle(p.item_group); // emoji + สีพื้น ตามหมวด (ใช้ตอนไม่มีรูป)
  const href = `/product/${encodeURIComponent(p.code)}`; // หน้ารายละเอียดสินค้า

  return (
    // relative → ให้ปุ่มหัวใจลอยอยู่มุมขวาบนของการ์ดได้
    <article className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 transition hover:shadow-lg">
      {/* ---------- รูป: มีรูปจาก ERPNext → ใช้รูป, ไม่มี → emoji ของหมวด ----------
          รูปกับชื่อเป็นลิงก์ แต่ปุ่มต่างๆ ไม่ใช่ (ห้ามซ้อนปุ่มไว้ในลิงก์) */}
      <Link href={href} className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl text-6xl ${style.bg}`}>
        {p.image ? (
          // ใช้ <img> ธรรมดา: รูปอยู่บน ERPNext (คนละโดเมน) ไม่ต้องตั้งค่า next/image เพิ่ม
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.item_name} className="size-full object-cover transition group-hover:scale-105" />
        ) : (
          <span className="transition group-hover:scale-110" aria-hidden>{style.emoji}</span>
        )}
      </Link>

      {/* ปุ่มหัวใจ: วางทับมุมรูป (อยู่นอก <Link> แต่ position: absolute) */}
      <WishlistButton product={p} className="absolute right-5 top-5" />

      {/* ---------- หมวด + ชื่อ + ดาว ---------- */}
      <p className="mt-3 text-xs text-zinc-500">{p.item_group}</p>
      <h3 className="line-clamp-2 text-sm font-medium">
        <Link href={href} className="hover:text-brand hover:underline">{p.item_name}</Link>
      </h3>
      {/* แสดงดาวเฉพาะสินค้าที่มีรีวิวแล้ว */}
      {p.rating_count > 0 && (
        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
          <Stars rating={p.rating_avg} /> ({p.rating_count})
        </div>
      )}

      {/* ---------- ราคา + ปุ่มตะกร้า (mt-auto = ดันลงล่างสุดของการ์ด) ---------- */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <p className="font-semibold text-brand">{formatPrice(p.price, p.currency)}</p>
        {/* Client Component ฝังใน Server Component ได้ → เฉพาะปุ่มนี้ทำงานใน browser */}
        <AddToCartButton product={p} />
      </div>
    </article>
  );
}
