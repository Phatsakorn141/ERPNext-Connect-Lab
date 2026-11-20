// กล่องสีเขียว "Stay in the Loop": สมัครรับข่าวทางอีเมล
// ส่วนนี้เป็น Server Component — เฉพาะฟอร์ม (NewsletterForm) ทำงานใน browser
import { Mail } from "lucide-react";
import NewsletterForm from "./NewsletterForm";

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

      <NewsletterForm />
    </section>
  );
}
