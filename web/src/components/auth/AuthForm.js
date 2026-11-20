// ฟอร์ม Login / สมัครสมาชิก (ใช้ร่วมกัน 2 หน้า) — Client Component
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, register, safeNext } from "@/lib/auth";

// mode: "login" | "register"
export default function AuthForm({ mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next")); // กลับไปหน้าเดิมหลัง login เช่น /login?next=/cart

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      router.push(next);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  // แก้ช่องเดียว ช่องอื่นคงเดิม
  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm({ ...form, [name]: e.target.value }),
    className: "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-brand",
  });

  // ลิงก์ไปอีกหน้า (ส่ง next ต่อไปด้วย)
  const otherHref = `${isRegister ? "/login" : "/register"}?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-zinc-200 p-8">
      <div className="space-y-1 text-center">
        <h1 className="font-serif text-3xl text-brand">{isRegister ? "Create Account" : "Welcome Back"}</h1>
        <p className="text-sm text-zinc-500">
          {isRegister ? "Join Pskant Shop to track your orders." : "Log in to your Pskant Shop account."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <label className="block text-sm">
            <span className="text-zinc-600">Full name</span>
            <input type="text" required maxLength={140} autoComplete="name" {...field("name")} />
          </label>
        )}
        <label className="block text-sm">
          <span className="text-zinc-600">Email</span>
          <input type="email" required autoComplete="email" {...field("email")} />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Password {isRegister && <span className="text-zinc-400">(at least 8 characters)</span>}</span>
          {/* autoComplete บอก password manager ว่าเป็นรหัสใหม่หรือรหัสเดิม */}
          <input type="password" required minLength={isRegister ? 8 : undefined} maxLength={128}
            autoComplete={isRegister ? "new-password" : "current-password"} {...field("password")} />
        </label>

        {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded-xl bg-brand py-3 font-medium text-white hover:bg-brand-light disabled:opacity-50">
          {busy ? "Please wait..." : isRegister ? "Create Account" : "Log In"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600">
        {isRegister ? "Already have an account? " : "New to Pskant Shop? "}
        <Link href={otherHref} className="font-medium text-brand hover:underline">
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
