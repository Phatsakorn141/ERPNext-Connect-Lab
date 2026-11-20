// app/account/page.js — บัญชีของฉัน (URL: /account)
// ตัวหน้าเป็น Server Component ธรรมดา ส่วนข้อมูลผู้ใช้อยู่ใน AccountView (Client)
// เพราะรู้ว่าใคร login ต้องใช้ cookie ของ browser แต่ละคน
import Header from "@/components/shop/Header";
import FeatureBar from "@/components/shop/FeatureBar";
import AccountView from "@/components/auth/AccountView";

export const metadata = { title: "My Account — Pskant Shop" };

export default function AccountPage() {
  return (
    <>
      <Header active="" />
      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-6">
        <AccountView />
        <FeatureBar />
      </main>
    </>
  );
}
