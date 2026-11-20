// ตารางการ์ดสินค้า + โครงตอนกำลังโหลด (skeleton) + ข้อความเมื่อ API ใช้ไม่ได้
import ProductCard from "./ProductCard";

// มือถือ 2 คอลัมน์ → แท็บเล็ต 3 → จอใหญ่ 5
const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5";

export default function ProductGrid({ products }) {
  if (products === null) return <ApiError />; // null = ดึงจาก API ไม่ได้
  if (products.length === 0) {
    return <p className="rounded-2xl border border-dashed p-10 text-center text-zinc-500">No products found.</p>;
  }
  return (
    <div className={GRID}>
      {products.map((p) => (
        <ProductCard key={p.code} product={p} />
      ))}
    </div>
  );
}

// แสดงระหว่างรอข้อมูล (ใช้เป็น fallback ของ <Suspense>)
export function ProductGridSkeleton({ count = 5 }) {
  return (
    <div className={GRID} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-zinc-200 p-3">
          <div className="aspect-square rounded-xl bg-zinc-100" />
          <div className="mt-3 h-3 w-1/3 rounded bg-zinc-100" />
          <div className="mt-2 h-4 w-3/4 rounded bg-zinc-100" />
          <div className="mt-4 h-5 w-1/2 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

// what = โหลดอะไรไม่ได้ (หน้าคำสั่งซื้อส่ง "your order")
export function ApiError({ what = "products" }) {
  return (
    <p className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-700">
      Could not load {what}. Is the API running? (<code>docker compose up -d</code>)
    </p>
  );
}
