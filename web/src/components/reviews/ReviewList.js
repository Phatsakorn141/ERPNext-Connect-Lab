// รายการรีวิวของสินค้า — Server Component (ดึงจาก FastAPI → MongoDB)
import { Stars } from "@/components/shop/ProductCard";
import { getReviews } from "@/lib/shop";

export default async function ReviewList({ code }) {
  const reviews = await getReviews(code);

  if (reviews === null) return <p className="text-sm text-red-700">Could not load reviews.</p>;
  if (reviews.length === 0) {
    return <p className="text-sm text-zinc-500">No reviews yet — be the first to review this product.</p>;
  }

  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border border-zinc-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* รูปโปรไฟล์ = ตัวอักษรแรกของชื่อ */}
            <span className="grid size-9 place-items-center rounded-full bg-mint text-sm font-semibold text-brand">
              {r.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium">{r.name}</span>
            <Stars rating={r.rating} />
            <time dateTime={r.created_at} className="ml-auto text-xs text-zinc-400">
              {new Date(r.created_at).toLocaleDateString("th-TH")}
            </time>
          </div>
          {/* whitespace-pre-line = ขึ้นบรรทัดใหม่ตามที่ลูกค้าพิมพ์ */}
          <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">{r.comment}</p>
        </li>
      ))}
    </ul>
  );
}
