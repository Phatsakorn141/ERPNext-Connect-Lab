// app/shop/page.js — หน้ารวมสินค้า (URL: /shop)
//   /shop                        → สินค้าทั้งหมด
//   /shop?category=Fashion       → เฉพาะหมวด
//   /shop?q=bag                  → ค้นหา (จากช่องค้นหาใน Header)
//   /shop?category=Fashion&q=bag → ทั้งสองอย่าง

import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { Search } from "lucide-react";
import Header from "@/components/shop/Header";
import FeatureBar from "@/components/shop/FeatureBar";
import ProductGrid, { ProductGridSkeleton } from "@/components/shop/ProductGrid";
import { getCategories, getProducts } from "@/lib/shop";

export const metadata = { title: "Shop — Pskant Shop" };

// ส่วนนี้ไม่ต้องรอข้อมูล → แสดงทันที
// searchParams = Promise ของ query string → ส่งต่อให้ส่วนที่อยู่ใน <Suspense> ไป await เอง
export default function ShopPage({ searchParams }) {
  return (
    <>
      <Header active="Shop" />
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6">
        <Suspense fallback={<ProductGridSkeleton count={10} />}>
          <ShopResults searchParams={searchParams} />
        </Suspense>
        <FeatureBar />
      </main>
    </>
  );
}

// สร้างลิงก์ /shop โดยคงค่าที่ไม่ได้เปลี่ยนไว้  เช่น เปลี่ยนหมวดแต่ยังค้นหาคำเดิมอยู่
function shopHref({ category, q }) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

async function ShopResults({ searchParams }) {
  const { category, q } = await searchParams; // อ่าน ?category=...&q=... จาก URL

  // ดึง 2 อย่างพร้อมกัน
  const [products, categories] = await Promise.all([
    getProducts({ category, search: q, limit: 100 }),
    getCategories(),
  ]);

  // หัวข้อเปลี่ยนตามสิ่งที่เลือก
  const title = q ? `Results for “${q}”` : category || "All Products";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-brand">{title}</h1>
          {products && <p className="text-sm text-zinc-500">{products.length} products</p>}
        </div>

        {/* ค้นหาในหน้านี้: ส่ง category ไปด้วยแบบซ่อน → ค้นหาในหมวดเดิม */}
        <Form action="/shop" className="flex w-full items-center rounded-full border border-zinc-300 pl-4 focus-within:border-brand sm:w-72">
          {category && <input type="hidden" name="category" value={category} />}
          {/* key: เปลี่ยน URL แล้วให้ช่องนี้แสดงค่าใหม่ (defaultValue ตั้งได้ครั้งเดียวตอนสร้าง) */}
          <input key={q} type="search" name="q" defaultValue={q} placeholder="Search..."
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
          <button type="submit" aria-label="Search" className="m-1 grid size-8 place-items-center rounded-full bg-brand text-white">
            <Search className="size-4" />
          </button>
        </Form>
      </div>

      {/* ปุ่มเลือกหมวด (chip) — หมวดที่เลือกอยู่เป็นสีเขียว */}
      {categories && (
        <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[{ name: null, label: "All" }, ...categories.map((c) => ({ name: c.name, label: `${c.name} (${c.count})` }))].map(
            ({ name, label }) => (
              <Link key={label} href={shopHref({ category: name, q })}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                  (category || null) === name
                    ? "border-brand bg-brand text-white"
                    : "border-zinc-300 hover:border-brand hover:text-brand"
                }`}>
                {label}
              </Link>
            ),
          )}
        </nav>
      )}

      <ProductGrid products={products} />
    </section>
  );
}
