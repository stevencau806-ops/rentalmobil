"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 lg:flex-row">
      {/* Brand panel */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 text-white lg:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1781959408/rcxemimskpt6mnzmbq3c.png"
          alt="Erlangga Rental Mobil"
          className="max-w-xs brightness-0 invert"
        />
        <h1 className="mt-8 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">
          Kelola usaha rental mobil Anda jadi lebih mudah.
        </h1>
        <p className="mt-4 max-w-md text-brand-100">
          Sistem terintegrasi untuk booking, data pelanggan, pembayaran, blacklist,
          denda keterlambatan, hingga laporan pendapatan — semua dalam satu aplikasi.
        </p>
        <ul className="mt-8 space-y-2 text-sm text-brand-100">
          {[
            "Manajemen armada & status mobil real-time",
            "Booking otomatis dengan perhitungan biaya",
            "Sistem blacklist & peringatan otomatis",
            "Laporan pendapatan bulanan & tahunan",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent-400" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-10 text-xs text-brand-300">
          © {new Date().getFullYear()} Erlangga Rental Mobil · Dibuat oleh OOS SHOP
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-4 py-10 sm:px-8 lg:rounded-l-3xl">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1781959408/rcxemimskpt6mnzmbq3c.png"
              alt="Erlangga Rental Mobil"
              className="max-w-[200px]"
            />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Masuk ke Akun</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan email dan password admin Anda.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@erlangga.id"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Hubungi administrator jika Anda lupa kredensial login.
          </p>
        </div>
      </div>
    </div>
  );
}
