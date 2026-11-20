// app/wishlist/page.js — สินค้าที่ถูกใจ (URL: /wishlist)
import Header from "@/components/shop/Header";
import FeatureBar from "@/components/shop/FeatureBar";
import WishlistView from "@/components/wishlist/WishlistView";

export const metadata = { title: "Wishlist — Pskant Shop" };

export default function WishlistPage() {
  return (
    <>
      <Header active="" />
      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-6">
        <WishlistView />
        <FeatureBar />
      </main>
    </>
  );
}
