import Link from "next/link";
import { getCars, getBookings } from "@/lib/queries";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { paymentStatusLabel } from "@/lib/utils";
import { MobileMenuGrid } from "@/components/dashboard/MobileMenuGrid";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [cars, bookings] = await Promise.all([getCars(), getBookings()]);

  const totalCars = cars.length;
  const availableCars = cars.filter((c) => c.status === "available").length;
  const rentedCars = cars.filter((c) => c.status === "rented").length;

  // Pendapatan bulan ini: disamakan dengan logika Laporan Bulanan
  // - filter: start_date di bulan ini (tanpa cek payment_status)
  // - sum: total_cost + late_fee + additional_fines (parsed dari JSON)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  function getTotalDenda(b: (typeof bookings)[number]): number {
    let total = Number(b.late_fee || 0);
    if (b.additional_fines) {
      try {
        const fines = JSON.parse(b.additional_fines) as { amount: number }[];
        total += fines.reduce((s, f) => s + (f.amount || 0), 0);
      } catch {
        /* abaikan JSON rusak */
      }
    }
    return total;
  }

  const monthRevenueBookings = bookings.filter((b) => {
    const d = new Date(b.start_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // DEBUG: log untuk audit perbedaan dengan Laporan
  console.log("[DASHBOARD-DEBUG] now:", now.toISOString(), "currentMonth:", currentMonth, "currentYear:", currentYear);
  console.log("[DASHBOARD-DEBUG] total bookings:", bookings.length, "monthRevenueBookings:", monthRevenueBookings.length);
  console.log("[DASHBOARD-DEBUG] boundary check (Aug 2026):");
  bookings.forEach((b) => {
    const d = new Date(b.start_date);
    const m = d.getMonth();
    const y = d.getFullYear();
    const raw = b.start_date;
    if ((m === 7 && y === 2026) || (m === 8 && y === 2026) || (m === 7 && y === 2026) || raw.includes("2026-08") || raw.includes("2026-09")) {
      console.log(`  - id=${b.id.slice(0,8)} start_date=${raw} parsed=${d.toISOString()} m=${m} y=${y} included=${m === currentMonth && y === currentYear}`);
    }
  });
  const monthRevenue = monthRevenueBookings.reduce(
    (sum, b) => sum + Number(b.total_cost) + getTotalDenda(b),
    0
  );

  // Active bookings (not yet returned)
  const activeBookings = bookings.filter((b) => !b.actual_return_date);
  const recentBookings = bookings.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan operasional · ${formatTanggal(now.toISOString())}`}
        action={
          <Link href="/booking">
            <Button>+ Booking Baru</Button>
          </Link>
        }
      />

      {/* Stats grid - colorful on mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Mobil"
          value={totalCars}
          icon="🚗"
          tone="blue"
        />
        <StatCard
          label="Tersedia"
          value={availableCars}
          icon="✅"
          tone="green"
        />
        <StatCard
          label="Disewa"
          value={rentedCars}
          icon="🔑"
          tone="amber"
        />
        <StatCard
          label="Booking Aktif"
          value={activeBookings.length}
          icon="📅"
          tone="purple"
        />
      </div>

      <div className="mt-3 sm:mt-4">
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatRupiah(monthRevenue)}
          icon="💰"
          tone="green"
          hint={`Dari ${monthRevenueBookings.length} transaksi`}
        />
      </div>

      {/* Mobile menu grid - only visible on mobile */}
      <div className="mt-5">
        <MobileMenuGrid />
      </div>

      {/* Recent bookings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Booking Terbaru</CardTitle>
          <Link href="/booking" className="text-xs font-medium text-brand-700 hover:underline">
            Lihat semua →
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {recentBookings.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              Belum ada booking.{" "}
              <Link href="/booking" className="text-brand-700 hover:underline">
                Buat booking pertama Anda
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <li key={b.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {b.customers?.name ?? "Pelanggan"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {b.cars?.brand} {b.cars?.model} · {b.cars?.plate}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatRupiah(Number(b.total_cost) + Number(b.late_fee || 0))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      {formatTanggal(b.start_date)} → {formatTanggal(b.end_date)}
                    </p>
                    <Badge tone={b.payment_status === "paid" ? "green" : "yellow"}>
                      {paymentStatusLabel[b.payment_status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Quick links - hidden on mobile since MobileMenuGrid replaces it */}
      <div className="mt-6 hidden grid-cols-2 gap-3 md:grid sm:grid-cols-4">
        {[
          { href: "/mobil", label: "Data Mobil", icon: "🚗" },
          { href: "/pelanggan", label: "Pelanggan", icon: "👤" },
          { href: "/pengeluaran", label: "Pengeluaran", icon: "💸" },
          { href: "/laporan", label: "Laporan", icon: "📊" },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="cursor-pointer p-4 text-center transition-shadow hover:shadow-md">
              <div className="text-2xl">{q.icon}</div>
              <div className="mt-1 text-xs font-medium text-slate-700">{q.label}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
