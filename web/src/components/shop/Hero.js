// Banner ใหญ่ด้านบน: ข้อความ + ปุ่ม + รูปสินค้า + ป้าย Summer Sale
import { ArrowRight, BadgeCheck, Leaf, Lock } from "lucide-react";

// จุดเด่นใต้ปุ่ม Shop Now
const TRUST = [
  { icon: BadgeCheck, text: "Premium Quality" },
  { icon: Leaf, text: "Eco Friendly" },
  { icon: Lock, text: "Trusted by 50K+ Customers" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-cream">
      {/* grid-cols-1 = คอลัมน์ไม่กว้างเกินจอ (กันข้อความโดนตัดบนมือถือ) */}
      <div className="grid grid-cols-1 items-center gap-6 p-8 md:grid-cols-2 md:p-12">
        {/* ---------- ซ้าย: ข้อความ ---------- */}
        <div className="space-y-5">
          {/* ป้าย Sale แบบเล็กสำหรับมือถือ (จอใหญ่ใช้ป้ายมุมขวาบนแทน) */}
          <span className="inline-block rounded-full bg-brand px-3 py-1 text-xs font-medium text-white md:hidden">
            Summer Sale · Up to 40% Off
          </span>
          <h1 className="font-serif text-4xl leading-tight text-brand md:text-6xl">
            Elevate Your <br /> Everyday
          </h1>
          <p className="max-w-sm text-zinc-600">
            Discover quality products across every category — made for the way you live.
          </p>
          <a href="#top-picks"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-light">
            Shop Now <ArrowRight className="size-4" />
          </a>
          <ul className="flex flex-wrap gap-5 pt-2 text-xs text-zinc-600">
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon className="size-4 text-brand" /> {text}
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- ขวา: "รูป" สินค้า (emoji ชั่วคราว จนกว่าจะมีรูปจริง) ---------- */}
        <div className="relative flex h-40 items-end justify-center gap-2 overflow-hidden text-5xl md:h-80 md:text-8xl" aria-hidden>
          <span className="absolute left-4 top-0 text-6xl opacity-60 md:text-9xl">🪴</span>
          <span>📻</span>
          <span>👟</span>
          <span className="text-7xl md:text-[9rem]">🧳</span>
          <span>⌚</span>
        </div>
      </div>

      {/* ---------- ป้าย Summer Sale มุมขวาบน (เฉพาะจอ md ขึ้นไป) ---------- */}
      <div className="absolute right-8 top-8 hidden rounded-xl bg-brand px-4 py-3 text-center text-white md:block">
        <p className="font-serif text-sm">SUMMER <br /> SALE</p>
        <p className="mt-1 text-[10px]">UP TO</p>
        <p className="text-3xl font-bold leading-none">40%</p>
        <p className="text-xs">OFF</p>
      </div>

      {/* ---------- จุดบอกหน้า slide (ตอนนี้ยังมีหน้าเดียว) ---------- */}
      <div className="flex justify-center gap-1.5 pb-5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-2 rounded-full ${i === 0 ? "bg-brand" : "bg-zinc-300"}`} />
        ))}
      </div>
    </section>
  );
}
