// การ์ดสินค้า 1 ชิ้น: รูป, หมวด, ชื่อ, ราคา, ปุ่มใส่ตะกร้า
// product มาจาก FastAPI GET /products:
//   { code, item_name, item_group, price, currency, image, description, ... }
import Link from "next/link";
import { Star } from "lucide-react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { categoryStyle } from "@/lib/categoryStyle";
import { formatPrice } from "@/lib/shop";

// ดาว 5 ดวง: เต็มตามคะแนน (ปัดลง) ที่เหลือเป็นดาวเทา (ใช้ในส่วนรีวิว)
export function Stars({ rating, className = "size-3.5" }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n}
          className={`${className} ${n <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
      ))}
    </span>
  );
}

export default function ProductCard({ product: p }) {
  const style = categoryStyle(p.item_group); // emoji + สีพื้น ตามหมวด (ใช้ตอนไม่มีรูป)
  const href = `/product/${encodeURIComponent(p.code)}`; // หน้ารายละเอียดสินค้า

  return (
    <article className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 transition hover:shadow-lg">
      {/* ---------- รูป: มีรูปจาก ERPNext → ใช้รูป, ไม่มี → emoji ของหมวด ----------
          รูปกับชื่อเป็นลิงก์ แต่ปุ่มตะกร้าไม่ใช่ (ห้ามซ้อนปุ่มไว้ในลิงก์) */}
      <Link href={href} className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl text-6xl ${style.bg}`}>
        {p.image ? (
          // ใช้ <img> ธรรมดา: รูปอยู่บน ERPNext (คนละโดเมน) ไม่ต้องตั้งค่า next/image เพิ่ม
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.item_name} className="size-full object-cover transition group-hover:scale-105" />
        ) : (
          <span className="transition group-hover:scale-110" aria-hidden>{style.emoji}</span>
        )}
      </Link>

      {/* ---------- หมวด + ชื่อ ---------- */}
      <p className="mt-3 text-xs text-zinc-500">{p.item_group}</p>
      <h3 className="line-clamp-2 text-sm font-medium">
        <Link href={href} className="hover:text-brand hover:underline">{p.item_name}</Link>
      </h3>

      {/* ---------- ราคา + ปุ่มตะกร้า (mt-auto = ดันลงล่างสุดของการ์ด) ---------- */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <p className="font-semibold text-brand">{formatPrice(p.price, p.currency)}</p>
        {/* Client Component ฝังใน Server Component ได้ → เฉพาะปุ่มนี้ทำงานใน browser */}
        <AddToCartButton product={p} />
      </div>
    </article>
  );
}
