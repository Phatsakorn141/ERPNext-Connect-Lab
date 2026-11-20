// app/not-found.js — หน้า 404 ของทั้งเว็บ
// แสดงเมื่อ: เรียก notFound() (เช่น /product/ไม่มีรหัสนี้) หรือเปิด URL ที่ไม่มีหน้า
import Link from "next/link";
import Header from "@/components/shop/Header";

export default function NotFound() {
  return (
    <>
      <Header active="" />
      <main className="mx-auto grid w-full max-w-7xl flex-1 place-items-center px-4 py-20 text-center">
        <div className="space-y-4">
          <p className="text-6xl" aria-hidden>🔍</p>
          <h1 className="font-serif text-3xl text-brand">Page not found</h1>
          <p className="text-zinc-500">The product or page you are looking for doesn&apos;t exist.</p>
          <Link href="/shop" className="inline-block rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-light">
            Back to Shop
          </Link>
        </div>
      </main>
    </>
  );
}
