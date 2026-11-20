// ไอคอน Account บน Header — login อยู่ → ชื่อ + ไป /account, ยังไม่ login → ไป /login
"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AccountLink() {
  const { status, user } = useAuth();
  const loggedIn = status === "user";
  // ชื่อแรกพอ (ยาวไปจะล้นบน Header)
  const label = loggedIn ? user.name.split(" ")[0] : "Login";

  return (
    <Link href={loggedIn ? "/account" : "/login"}
      className="relative flex flex-col items-center gap-0.5 text-xs text-zinc-700 hover:text-brand">
      <User className={`size-5 ${loggedIn ? "fill-mint text-brand" : ""}`} />
      <span className="hidden max-w-16 truncate sm:block">{status === "loading" ? "Account" : label}</span>
    </Link>
  );
}
