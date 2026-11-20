// app/page.js — หน้าแรกของร้าน Pskant Shop (URL: /)
// ไม่มี "use client" → เป็น Server Component (สร้าง HTML ที่ server)
//
// ข้อมูลจริง (จาก FastAPI → MongoDB): หมวดหมู่, สินค้าแนะนำ, รีวิวลูกค้า
// ข้อมูลตั้งไว้ในโค้ด (data/mock.js):  banner โปรโมชัน

import { Suspense } from "react";
import Header from "@/components/shop/Header";
import Hero from "@/components/shop/Hero";
import CategoryIcons from "@/components/shop/CategoryIcons";
import TopPicks from "@/components/shop/TopPicks";
import { ProductGridSkeleton } from "@/components/shop/ProductGrid";
import PromoBanners from "@/components/shop/PromoBanners";
import Testimonials from "@/components/shop/Testimonials";
import Newsletter from "@/components/shop/Newsletter";
import FeatureBar from "@/components/shop/FeatureBar";
import { promos } from "@/data/mock";

export default function Home() {
  return (
    <>
      <Header active="Home" />
      {/* space-y-12 = เว้นระยะห่างระหว่างแต่ละส่วน */}
      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-6">
        <Hero />

        {/* Suspense: ส่วนที่ต้องรอข้อมูลจาก API
            → ส่งหน้าเว็บส่วนอื่นไปก่อน แสดง fallback ระหว่างรอ แล้วค่อยเติมข้อมูลจริงตามมา */}
        <Suspense fallback={<div className="h-24" />}>
          <CategoryIcons />
        </Suspense>

        {/* id="top-picks" → ปุ่ม Shop Now ใน Hero เลื่อนลงมาที่นี่ */}
        <section id="top-picks" className="scroll-mt-4">
          <Suspense fallback={<ProductGridSkeleton />}>
            <TopPicks />
          </Suspense>
        </section>

        <PromoBanners promos={promos} />
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />}>
          <Testimonials />
        </Suspense>
        <Newsletter />
        <FeatureBar />
      </main>
    </>
  );
}
