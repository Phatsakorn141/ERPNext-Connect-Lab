// banner โปรโมชัน 3 ช่อง (New Arrivals / Home Refresh / Tech Essentials) → ลิงก์ไปหน้าหมวด
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PromoBanners({ promos }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {promos.map((p) => (
        <Link key={p.tag} href={p.href}
          className={`group flex items-center justify-between overflow-hidden rounded-2xl p-6 ${p.bg}`}>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-500">{p.tag}</p>
            <h3 className="max-w-[10rem] font-serif text-2xl leading-tight text-brand">{p.title}</h3>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">
              Shop Now <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </div>
          <span className="text-7xl transition group-hover:scale-110" aria-hidden>{p.emoji}</span>
        </Link>
      ))}
    </section>
  );
}
