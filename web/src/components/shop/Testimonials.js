// "Loved By Thousands": รีวิวดีๆ ล่าสุดจากลูกค้าจริง (MongoDB) + คะแนนเฉลี่ยทั้งร้าน
// async Server Component → หน้าแรกห่อด้วย <Suspense>
import Link from "next/link";
import { BadgeCheck, Heart } from "lucide-react";
import { Stars } from "./ProductCard";
import { getLatestReviews } from "@/lib/shop";

export default async function Testimonials() {
  const data = await getLatestReviews(3); // { average, count, items } หรือ null ถ้า API ใช้ไม่ได้
  const items = data?.items ?? [];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Loved By Our Customers <Heart className="size-5 fill-rose-400 text-rose-400" />
        </h2>
        {data?.count > 0 && (
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            {data.average}/5 from {data.count} {data.count === 1 ? "review" : "reviews"} <Stars rating={data.average} className="size-4" />
          </p>
        )}
      </div>

      {/* ยังไม่มีรีวิว → ชวนให้รีวิว (ไม่แสดงรีวิวปลอม) */}
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-zinc-500">
          No reviews yet. <Link href="/shop" className="text-brand underline">Shop</Link> and be the first to share your thoughts!
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="flex gap-3 rounded-2xl border border-zinc-200 p-4">
              {/* รูปโปรไฟล์ = ตัวอักษรแรกของชื่อ */}
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mint font-semibold text-brand">
                {t.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 space-y-1">
                <figcaption className="flex items-center gap-1 text-sm font-semibold">
                  {t.name} <BadgeCheck className="size-4 text-brand" />
                </figcaption>
                <Stars rating={t.rating} />
                <blockquote className="line-clamp-3 text-sm text-zinc-600">&ldquo;{t.comment}&rdquo;</blockquote>
                {/* รีวิวสินค้าชิ้นไหน → ลิงก์ไปหน้าสินค้า */}
                {t.item_name && (
                  <Link href={`/product/${encodeURIComponent(t.product_code)}`} className="block truncate text-xs text-brand hover:underline">
                    on {t.item_name}
                  </Link>
                )}
              </div>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
