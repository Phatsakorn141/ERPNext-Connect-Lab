// แถววงกลมหมวดหมู่ — ดึงหมวดจริง (Item Group ที่มีสินค้า) จาก FastAPI
// คลิกแล้วไปหน้า /shop?category=ชื่อหมวด
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { categoryStyle } from "@/lib/categoryStyle";
import { getCategories } from "@/lib/shop";

function CategoryItem({ icon: Icon, label, href }) {
  return (
    <Link href={href} className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center text-xs">
      <span className="grid size-16 place-items-center rounded-full bg-cream text-brand transition group-hover:bg-brand group-hover:text-white">
        <Icon className="size-6" />
      </span>
      {label}
    </Link>
  );
}

export default async function CategoryIcons() {
  const categories = (await getCategories()) || []; // API ใช้ไม่ได้ → แสดงแค่ View All

  return (
    // overflow-x-auto = จอเล็กเลื่อนซ้ายขวาได้, md:justify-between = จอใหญ่กระจายเต็มแถว
    <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] md:justify-between">
      {categories.map((c) => (
        <CategoryItem key={c.name} icon={categoryStyle(c.name).icon} label={c.name}
          // encodeURIComponent: "Home & Living" มี & ต้องแปลงก่อนใส่ใน URL
          href={`/shop?category=${encodeURIComponent(c.name)}`} />
      ))}
      <CategoryItem icon={LayoutGrid} label="View All" href="/shop" />
    </div>
  );
}
