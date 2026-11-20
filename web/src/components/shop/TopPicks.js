// ส่วน "Top Picks For You": ดึงสินค้าจริงจาก FastAPI
// async component = ดึงข้อมูลเองได้ (หน้าแรกห่อด้วย <Suspense> ให้แสดง skeleton ระหว่างรอ)
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import ProductGrid from "./ProductGrid";
import { getProducts } from "@/lib/shop";

export default async function TopPicks() {
  const products = await getProducts({ limit: 10 });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Top Picks For You <Sparkles className="size-5 text-amber-400" />
        </h2>
        <Link href="/shop" className="flex items-center text-sm text-brand hover:underline">
          See All <ChevronRight className="size-4" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </>
  );
}
