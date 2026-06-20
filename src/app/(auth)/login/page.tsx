"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Email atau password salah. Periksa kembali kredensial Anda.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1781964295/qwfotufturwr6qpyjktv.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1781959408/rcxemimskpt6mnzmbq3c.png"
          alt="Erlangga Rental Mobil"
          className="mb-2 w-48"
        />

        {/* Tagline */}
        <p className="mb-8 text-center text-lg font-semibold text-slate-700">
          Solusi perjalanan Anda,<br />
          nyaman dan terpercaya.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Email field */}
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b5998" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username atau Email"
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Password field */}
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b5998" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Forgot password */}
          <div className="text-right">
            <span className="cursor-pointer text-sm font-medium text-blue-800 hover:underline">
              Lupa Password?
            </span>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#1e3a6d] py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-[#162d55] disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-slate-300" />
          <span className="text-xs text-slate-500">atau</span>
          <div className="h-px flex-1 bg-slate-300" />
        </div>

        {/* Guest login */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#1e3a6d] bg-white py-3 text-sm font-semibold text-[#1e3a6d] shadow transition-all hover:bg-slate-50"
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Login sebagai Tamu
        </button>
      </div>

      {/* Car image at bottom */}
      <div className="relative z-10 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1781964319/qbavk4vtgvvoqatema9c.png"
          alt="Mobil"
          className="w-full object-contain"
        />
      </div>

      {/* Footer text */}
      <div className="relative z-10 w-full pb-4 text-center">
        <p className="text-sm text-slate-600">
          Belum punya akun?{" "}
          <span className="cursor-pointer font-semibold text-blue-800 underline">
            Daftar sekarang
          </span>
        </p>
      </div>
    </div>
  );
}
