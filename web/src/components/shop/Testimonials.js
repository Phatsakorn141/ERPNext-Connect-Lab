// "Loved By Thousands": รีวิวจากลูกค้า 3 การ์ด
import { BadgeCheck, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Stars } from "./ProductCard";

export default function Testimonials({ items }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Loved By Thousands <Heart className="size-5 fill-rose-400 text-rose-400" />
        </h2>
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          4.8/5 Average Rating <Stars rating={5} className="size-4" />
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* ปุ่มเลื่อนซ้าย/ขวา (ยังไม่ทำงาน — ไว้ทำตอนเพิ่ม state) */}
        <button aria-label="Previous" className="hidden size-9 shrink-0 place-items-center rounded-full border md:grid">
          <ChevronLeft className="size-4" />
        </button>

        <div className="grid flex-1 gap-4 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.name} className="flex gap-3 rounded-2xl border border-zinc-200 p-4">
              {/* รูปโปรไฟล์ = ตัวอักษรแรกของชื่อ */}
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mint font-semibold text-brand">
                {t.initial}
              </span>
              <div className="space-y-1">
                <figcaption className="flex items-center gap-1 text-sm font-semibold">
                  {t.name} <BadgeCheck className="size-4 text-brand" />
                </figcaption>
                <Stars rating={5} />
                <blockquote className="text-sm text-zinc-600">&ldquo;{t.text}&rdquo;</blockquote>
              </div>
            </figure>
          ))}
        </div>

        <button aria-label="Next" className="hidden size-9 shrink-0 place-items-center rounded-full border md:grid">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
