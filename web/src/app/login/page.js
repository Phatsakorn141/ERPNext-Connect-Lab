// app/login/page.js — เข้าสู่ระบบ (URL: /login  หรือ /login?next=/cart)
import { Suspense } from "react";
import Header from "@/components/shop/Header";
import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Log In — Pskant Shop" };

export default function LoginPage() {
  return (
    <>
      <Header active="" />
      <main className="w-full px-4 py-12">
        {/* AuthForm อ่าน ?next= ด้วย useSearchParams → ต้องอยู่ใน <Suspense> (กฎของ Next.js 16) */}
        <Suspense fallback={<div className="mx-auto h-96 max-w-md animate-pulse rounded-3xl bg-zinc-100" />}>
          <AuthForm mode="login" />
        </Suspense>
      </main>
    </>
  );
}
