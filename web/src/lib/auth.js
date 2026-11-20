// lib/auth.js — สถานะ login ฝั่ง browser
//
// ใช้ใน Client Component:
//   const auth = useAuth();      // { status: "loading" | "guest" | "user", user }
//   await login(email, password) / await register(name, email, password) / await logout()
//
// cookie session เป็น httpOnly → JavaScript อ่านไม่ได้ (ปลอดภัย)
// วิธีรู้ว่า login อยู่ไหม = ถาม API GET /auth/me (browser แนบ cookie ไปให้เอง)
// ถามครั้งเดียวตอนมี component แรกใช้ แล้วทุก component ใช้ผลร่วมกัน (store แบบเดียวกับตะกร้า)

"use client";

import { useSyncExternalStore } from "react";
import { api } from "./api";

const LOADING = { status: "loading", user: null };

let state = LOADING;
let started = false; // ถาม /auth/me ไปแล้วหรือยัง
const listeners = new Set();

function setState(next) {
  state = next;
  listeners.forEach((notify) => notify());
}

// ถาม API ว่าตอนนี้เป็นใคร (401 → guest)
export async function refreshUser() {
  try {
    setState({ status: "user", user: await api("/auth/me") });
  } catch {
    setState({ status: "guest", user: null });
  }
}

function subscribe(notify) {
  listeners.add(notify);
  if (!started) {
    started = true;
    refreshUser();
  }
  return () => listeners.delete(notify);
}

export function useAuth() {
  // server ไม่รู้ว่าใคร login → ถือว่า "loading" แล้วค่อยรู้ใน browser
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}

export async function login(email, password) {
  const user = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setState({ status: "user", user });
  return user;
}

export async function register(name, email, password) {
  const user = await api("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  setState({ status: "user", user });
  return user;
}

export async function logout() {
  await api("/auth/logout", { method: "POST" });
  setState({ status: "guest", user: null });
}

// กัน "open redirect": ?next= ต้องเป็น path ในเว็บเรา (ขึ้นต้น / แต่ไม่ใช่ // ที่พาไปเว็บอื่นได้)
export function safeNext(next, fallback = "/account") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
