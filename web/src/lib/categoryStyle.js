// lib/categoryStyle.js — หน้าตาของแต่ละหมวด (ไอคอน, emoji แทนรูป, สีพื้น)
// ชื่อหมวด = ชื่อ Item Group ใน ERPNext  (หมวดที่ไม่มีในนี้ใช้ค่า DEFAULT)
import {
  BookOpen, Dumbbell, LayoutGrid, Monitor, PawPrint, Puzzle, Shirt, Sofa, Sparkles,
} from "lucide-react";

const STYLES = {
  Electronics: { icon: Monitor, emoji: "🎧", bg: "bg-zinc-100" },
  Fashion: { icon: Shirt, emoji: "👕", bg: "bg-mint" },
  "Home & Living": { icon: Sofa, emoji: "🛋️", bg: "bg-cream" },
  Beauty: { icon: Sparkles, emoji: "🧴", bg: "bg-rose-50" },
  Sports: { icon: Dumbbell, emoji: "🧘", bg: "bg-sky-50" },
  "Toys & Kids": { icon: Puzzle, emoji: "🧩", bg: "bg-amber-50" },
  Books: { icon: BookOpen, emoji: "📚", bg: "bg-cream" },
  "Pet Supplies": { icon: PawPrint, emoji: "🐾", bg: "bg-mint" },
};

const DEFAULT = { icon: LayoutGrid, emoji: "📦", bg: "bg-zinc-100" };

export function categoryStyle(name) {
  return STYLES[name] || DEFAULT;
}
