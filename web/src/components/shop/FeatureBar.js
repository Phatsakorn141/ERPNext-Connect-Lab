// แถบจุดเด่นของร้านด้านล่าง + footer
import Link from "next/link";
import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const FEATURES = [
  { icon: Truck, title: "Free Shipping", text: "On orders over ฿1,500" },
  { icon: RotateCcw, title: "Easy Returns", text: "30 days return policy" },
  { icon: ShieldCheck, title: "Secure Payments", text: "100% secure checkout" },
  { icon: Headphones, title: "24/7 Support", text: "We're here to help" },
];

export default function FeatureBar() {
  return (
    <footer className="space-y-6">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200 p-4 md:grid-cols-4 md:gap-6 md:p-6">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <Icon className="size-8 shrink-0 text-brand" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-zinc-500">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-2 pb-6 text-xs text-zinc-500">
        <p>© 2026 Pskant Shop · Powered by ERPNext</p>
        {/* หน้าจัดการลูกค้าเดิม (บทที่ 6) */}
        <Link href="/customers" className="hover:text-brand hover:underline">Admin: Customers</Link>
      </div>
    </footer>
  );
}
