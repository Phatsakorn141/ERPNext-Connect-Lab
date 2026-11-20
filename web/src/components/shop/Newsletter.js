// กล่องสีเขียว "Stay in the Loop": สมัครรับข่าวทางอีเมล
// เฟส 6 จะส่งอีเมลไปเก็บใน MongoDB (ตอนนี้ยังเป็นหน้าตาอย่างเดียว)
import { Lock, Mail } from "lucide-react";

export default function Newsletter() {
  return (
    // grid-cols-1 = คอลัมน์ไม่กว้างเกินจอ (กันข้อความล้นบนมือถือ)
    <section className="grid grid-cols-1 items-center gap-6 rounded-3xl bg-brand p-6 text-white md:grid-cols-2 md:p-10">
      <div className="flex min-w-0 items-center gap-5">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white/10">
          <Mail className="size-7" />
        </span>
        <div>
          <h2 className="font-serif text-2xl">Stay in the Loop</h2>
          <p className="text-sm text-white/70">
            Get exclusive deals, new arrivals and style inspiration straight to your inbox.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex min-w-0 rounded-full bg-white p-1">
          <input type="email" placeholder="Enter your email address"
            className="min-w-0 flex-1 bg-transparent px-4 text-sm text-zinc-900 outline-none" />
          {/* type="button" = ยังไม่ส่งข้อมูลจริง (กันหน้ารีโหลด) */}
          <button type="button" className="rounded-full bg-brand px-5 py-2 text-sm hover:bg-brand-light">
            Subscribe
          </button>
        </div>
        <p className="flex items-center gap-1 pl-4 text-xs text-white/60">
          <Lock className="size-3" /> We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
