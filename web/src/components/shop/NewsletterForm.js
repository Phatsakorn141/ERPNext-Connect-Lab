// ฟอร์มสมัครรับข่าว — Client Component → POST /newsletter (เก็บใน MongoDB)
"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { api } from "@/lib/api";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const r = await api("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
      setStatus("done");
      setMessage(r.already ? "You're already subscribed — thank you!" : "Thanks for subscribing!");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex min-w-0 rounded-full bg-white p-1">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address" aria-label="Email address"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-zinc-900 outline-none" />
        <button type="submit" disabled={status === "sending"}
          className="rounded-full bg-brand px-5 py-2 text-sm hover:bg-brand-light disabled:opacity-50">
          {status === "sending" ? "..." : "Subscribe"}
        </button>
      </div>
      {/* aria-live = โปรแกรมอ่านหน้าจออ่านข้อความนี้ให้เมื่อเปลี่ยน */}
      <p aria-live="polite" className={`pl-4 text-xs ${status === "error" ? "text-red-200" : "text-white/80"}`}>
        {status === "done" || status === "error" ? (
          message
        ) : (
          <span className="flex items-center gap-1 text-white/60">
            <Lock className="size-3" /> We respect your privacy. Unsubscribe anytime.
          </span>
        )}
      </p>
    </form>
  );
}
