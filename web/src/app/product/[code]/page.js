// app/product/[code]/page.js — หน้ารายละเอียดสินค้า (URL: /product/HP-001)
// [code] ในชื่อโฟลเดอร์ = ส่วนของ URL ที่เปลี่ยนได้ (dynamic route)
//   /product/HP-001 → params = { code: "HP-001" }

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import WishlistButton from "@/components/wishlist/WishlistButton";
import ReviewForm from "@/components/reviews/ReviewForm";
import ReviewList from "@/components/reviews/ReviewList";
import { Stars } from "@/components/shop/ProductCard";
import Header from "@/components/shop/Header";
import FeatureBar from "@/components/shop/FeatureBar";
import ProductGrid, { ApiError, ProductGridSkeleton } from "@/components/shop/ProductGrid";
import { categoryStyle } from "@/lib/categoryStyle";
import { formatPrice, getProduct, getProducts } from "@/lib/shop";

// ชื่อแท็บ browser = ชื่อสินค้า  (Next.js เรียกฟังก์ชันนี้ก่อนสร้างหน้า)
export async function generateMetadata({ params }) {
  const { code } = await params;
  const { product } = await getProduct(code);
  return { title: product ? `${product.item_name} — Pskant Shop` : "Product — Pskant Shop" };
}

// ส่วนนี้แสดงทันที ส่วนที่ต้องรอ params / ข้อมูล อยู่ใน <Suspense>
export default function ProductPage({ params }) {
  return (
    <>
      <Header active="Shop" />
      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-6">
        <Suspense fallback={<DetailSkeleton />}>
          {/* params เป็น Promise → .then() แล้วส่ง code ให้ component ข้างใน */}
          {params.then(({ code }) => <ProductDetail code={code} />)}
        </Suspense>
        <FeatureBar />
      </main>
    </>
  );
}

async function ProductDetail({ code }) {
  const { status, product: p } = await getProduct(code);
  if (status === "not_found") notFound(); // → แสดง app/not-found.js
  if (status === "error") return <ApiError />;

  const style = categoryStyle(p.item_group);
  const categoryHref = `/shop?category=${encodeURIComponent(p.item_group)}`;

  return (
    <>
      {/* ---------- breadcrumb: Home > Shop > หมวด > ชื่อสินค้า ---------- */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        <Link href="/" className="hover:text-brand">Home</Link>
        <ChevronRight className="size-4" />
        <Link href="/shop" className="hover:text-brand">Shop</Link>
        <ChevronRight className="size-4" />
        <Link href={categoryHref} className="hover:text-brand">{p.item_group}</Link>
        <ChevronRight className="size-4" />
        <span className="text-zinc-800">{p.item_name}</span>
      </nav>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* ---------- ซ้าย: รูปใหญ่ ---------- */}
        <div className={`grid aspect-square place-items-center overflow-hidden rounded-3xl text-[8rem] ${style.bg}`}>
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.item_name} className="size-full object-cover" />
          ) : (
            <span aria-hidden>{style.emoji}</span>
          )}
        </div>

        {/* ---------- ขวา: ข้อมูลสินค้า ---------- */}
        <div className="flex flex-col gap-5">
          <Link href={categoryHref}
            className="w-fit rounded-full bg-mint px-3 py-1 text-xs font-medium text-brand hover:bg-brand hover:text-white">
            {p.item_group}
          </Link>
          <h1 className="font-serif text-3xl leading-tight text-brand md:text-4xl">{p.item_name}</h1>
          {/* คะแนนรีวิว (rating_avg/rating_count ถูกเติมลงสินค้าตอนมีคนรีวิว) → กดแล้วเลื่อนลงไปที่ส่วนรีวิว */}
          {p.rating_count > 0 && (
            <a href="#reviews" className="-mt-2 flex w-fit items-center gap-2 text-sm text-zinc-600 hover:text-brand">
              <Stars rating={p.rating_avg} className="size-4" /> {p.rating_avg} ({p.rating_count} {p.rating_count === 1 ? "review" : "reviews"})
            </a>
          )}
          <p className="text-3xl font-semibold">{formatPrice(p.price, p.currency)}</p>
          {p.description && <p className="leading-relaxed text-zinc-600">{p.description}</p>}

          {/* ข้อมูลจาก ERPNext: รหัสสินค้า (Item Code) + หน่วยนับ (UOM) */}
          <dl className="grid w-fit grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-zinc-500">SKU</dt>
            <dd className="font-mono">{p.code}</dd>
            <dt className="text-zinc-500">Unit</dt>
            <dd>{p.uom}</dd>
          </dl>

          {/* ปุ่มใส่ตะกร้า + ถูกใจ (Client Component) — ไม่มีราคาใน ERPNext → ปุ่มตะกร้ากดไม่ได้ */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <AddToCartButton product={p} variant="full" />
            <WishlistButton product={p} variant="full" />
          </div>

          <ul className="space-y-2 border-t pt-5 text-sm text-zinc-600">
            <li className="flex items-center gap-2"><Truck className="size-4 text-brand" /> Free shipping on orders over ฿1,500</li>
            <li className="flex items-center gap-2"><RotateCcw className="size-4 text-brand" /> 30-day easy returns</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand" /> Secure checkout</li>
          </ul>
        </div>
      </section>

      {/* ---------- รีวิว: รายการ (Server) + ฟอร์ม (Client) ---------- */}
      <section id="reviews" className="scroll-mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Customer Reviews</h2>
          <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />}>
            <ReviewList code={p.code} />
          </Suspense>
        </div>
        <ReviewForm code={p.code} />
      </section>

      {/* ---------- สินค้าในหมวดเดียวกัน (Suspense แยก → หน้าหลักขึ้นก่อนไม่ต้องรอส่วนนี้) ---------- */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">You May Also Like</h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <Related category={p.item_group} exclude={p.code} />
        </Suspense>
      </section>
    </>
  );
}

// สินค้าหมวดเดียวกัน ไม่เอาตัวที่กำลังดูอยู่  (ไม่มีเลย → เอาสินค้าหมวดอื่นมาแทน)
async function Related({ category, exclude }) {
  const sameCategory = ((await getProducts({ category, limit: 6 })) || []).filter((x) => x.code !== exclude);
  const products = sameCategory.length
    ? sameCategory
    : ((await getProducts({ limit: 6 })) || []).filter((x) => x.code !== exclude).slice(0, 5);
  return <ProductGrid products={products} />;
}

// โครงตอนกำลังโหลด
function DetailSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-8 md:grid-cols-2" aria-busy="true">
      <div className="aspect-square rounded-3xl bg-zinc-100" />
      <div className="space-y-4">
        <div className="h-6 w-24 rounded-full bg-zinc-100" />
        <div className="h-10 w-3/4 rounded bg-zinc-100" />
        <div className="h-8 w-1/3 rounded bg-zinc-100" />
        <div className="h-20 rounded bg-zinc-100" />
      </div>
    </div>
  );
}
