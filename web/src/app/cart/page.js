// app/cart/page.js — หน้าตะกร้า (URL: /cart)
// ตัวหน้าเป็น Server Component — ส่วนตะกร้า (CartView) เป็น Client Component เพราะใช้ localStorage
import Header from "@/components/shop/Header";
import FeatureBar from "@/components/shop/FeatureBar";
import CartView from "@/components/cart/CartView";

export const metadata = { title: "Cart — Pskant Shop" };

export default function CartPage() {
  return (
    <>
      <Header active="" />
      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-6">
        <CartView />
        <FeatureBar />
      </main>
    </>
  );
}
