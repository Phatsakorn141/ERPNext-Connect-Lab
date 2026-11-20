// Header ของร้าน: แถบประกาศด้านบน + โลโก้/ค้นหา/ไอคอน + เมนู
import Link from "next/link";
import Form from "next/form"; // ฟอร์มแบบ GET ที่เปลี่ยนหน้าโดยไม่โหลดใหม่ทั้งหน้า
import {
  ChevronDown, LayoutGrid, RotateCcw, Search,
  ShieldCheck, ShoppingBag, Truck, User,
} from "lucide-react";
import CartLink from "@/components/cart/CartLink";
import WishlistLink from "@/components/wishlist/WishlistLink";

// เมนูหลัก: [ชื่อ, ลิงก์]  (href "#" = ยังไม่มีหน้า)
const NAV = [
  ["Home", "/"], ["Shop", "/shop"], ["Deals", "#"], ["New Arrivals", "#"],
  ["Brands", "#"], ["Inspiration", "#"], ["Track Order", "#"],
];

// ปุ่มไอคอน (Account — ยังไม่มีระบบ login)
function IconButton({ icon: Icon, label }) {
  return (
    <button className="relative flex flex-col items-center gap-0.5 text-xs text-zinc-700 hover:text-brand">
      <Icon className="size-5" />
      <span className="hidden sm:block">{label}</span>
    </button>
  );
}

// active = ชื่อเมนูที่กำลังเปิดอยู่ (ขีดเส้นใต้)  เช่น <Header active="Shop" />
export default function Header({ active = "Home" }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      {/* ---------- แถบประกาศสีเขียวด้านบน (ซ่อนบนมือถือ เหลือข้อความเดียว) ---------- */}
      <div className="bg-brand text-xs text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 py-2">
          <span className="flex items-center gap-1.5"><Truck className="size-3.5" /> Free Shipping on Orders Over ฿1,500</span>
          <span className="hidden items-center gap-1.5 md:flex"><RotateCcw className="size-3.5" /> 30-Day Easy Returns</span>
          <span className="hidden items-center gap-1.5 md:flex"><ShieldCheck className="size-3.5" /> Secure Payments</span>
        </div>
      </div>

      {/* ---------- โลโก้ + ช่องค้นหา + ไอคอน ---------- */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
            <ShoppingBag className="size-5" />
          </span>
          <span className="leading-none">
            <span className="block font-serif text-xl font-bold text-brand">Pskant</span>
            <span className="text-[10px] tracking-[0.3em] text-zinc-500">SHOP</span>
          </span>
        </Link>

        {/* ค้นหา: กด Enter → ไปหน้า /shop?q=คำค้น
            order-last + w-full บนมือถือ → ช่องค้นหาลงไปอยู่บรรทัดล่าง */}
        <Form action="/shop" className="order-last flex w-full items-center rounded-full border border-zinc-300 pl-4 focus-within:border-brand md:order-none md:mx-6 md:w-auto md:flex-1">
          <input
            type="search"
            name="q" // ชื่อ field = ชื่อ query string (?q=...)
            placeholder="Search products..."
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
          />
          <button type="submit" aria-label="Search" className="m-1 grid size-8 place-items-center rounded-full bg-brand text-white">
            <Search className="size-4" />
          </button>
        </Form>

        <div className="ml-auto flex items-center gap-5 md:ml-0">
          <IconButton icon={User} label="Account" />
          <WishlistLink /> {/* Client Component: จำนวนมาจาก wishlist ใน localStorage */}
          <CartLink /> {/* Client Component: ตัวเลขมาจากตะกร้าใน localStorage */}
        </div>
      </div>

      {/* ---------- เมนู (เลื่อนแนวนอนได้บนจอเล็ก, ซ่อน scrollbar) ---------- */}
      <nav className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 pb-3 text-sm [scrollbar-width:none]">
        <button className="flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-white">
          <LayoutGrid className="size-4" /> All Categories <ChevronDown className="size-4" />
        </button>
        {NAV.map(([label, href]) => (
          <Link key={label} href={href}
            className={`shrink-0 hover:text-brand ${label === active ? "font-semibold text-brand underline underline-offset-8" : "text-zinc-700"}`}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
