// app/register/page.js — สมัครสมาชิก (URL: /register)
// สมัครแล้ว: บัญชีอยู่ใน MongoDB + มี Customer ใน ERPNext ผูกกับบัญชี
import { Suspense } from "react";
import Header from "@/components/shop/Header";
import AuthForm from "@/components/auth/AuthForm";

export const metadata = { title: "Create Account — Pskant Shop" };

export default function RegisterPage() {
  return (
    <>
      <Header active="" />
      <main className="w-full px-4 py-12">
        <Suspense fallback={<div className="mx-auto h-[28rem] max-w-md animate-pulse rounded-3xl bg-zinc-100" />}>
          <AuthForm mode="register" />
        </Suspense>
      </main>
    </>
  );
}
