// ฟอร์มเขียนรีวิว — Client Component
// ส่งแล้วสั่ง router.refresh() → Next.js ดึงข้อมูลหน้านี้ใหม่จาก server (เห็นรีวิวใหม่ + คะแนนเฉลี่ยใหม่)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { api } from "@/lib/api";

export default function ReviewForm({ code }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0); // ดาวที่เมาส์ชี้อยู่ (โชว์ตัวอย่างก่อนกด)
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/products/${encodeURIComponent(code)}/reviews`, {
        method: "POST",
        body: JSON.stringify({ name, rating, comment }),
      });
      setDone(true);
      setName("");
      setComment("");
      setRating(5);
      router.refresh(); // โหลดข้อมูลหน้าใหม่ (Server Component ดึงรีวิวใหม่)
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-cream p-5">
      <h3 className="font-semibold">Write a Review</h3>

      {/* เลือกดาว 1–5 */}
      <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`}
            onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}>
            <Star className={`size-6 ${n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
          </button>
        ))}
      </div>

      <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60}
        placeholder="Your name" aria-label="Your name"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} required minLength={3} maxLength={1000}
        rows={3} placeholder="What did you like or dislike?" aria-label="Review"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand" />

      {error && <p className="rounded-lg bg-red-100 p-2 text-sm text-red-800">{error}</p>}
      {done && <p className="rounded-lg bg-green-100 p-2 text-sm text-green-800">Thanks for your review!</p>}

      <button type="submit" disabled={busy}
        className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
        {busy ? "Sending..." : "Submit Review"}
      </button>
    </form>
  );
}
