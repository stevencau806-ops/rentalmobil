import Link from "next/link";
import { getCars, getBookings, getSettings } from "@/lib/queries";
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
  const [cars, bookings, settings] = await Promise.all([getCars(), getBookings(), getSettings()]);

  const totalCars = cars.length;
  const availableCars = cars.filter((c) => c.status === "available").length;
  const rentedCars = cars.filter((c) => c.status === "rented").length;

  // Pendapatan bulan ini: sum total_cost + late_fee for paid bookings created this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRevenue = bookings
    .filter(
      (b) =>
        b.payment_status === "paid" &&
        new Date(b.created_at) >= monthStart
    )
    .reduce((sum, b) => sum + (Number(b.total_cost) + Number(b.late_fee || 0)), 0);

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
          hint={`Dari ${bookings.filter(
            (b) => b.payment_status === "paid" && new Date(b.created_at) >= monthStart
          ).length} transaksi lunas`}
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

      {/* QRIS - tampil kalau sudah diisi */}
      {settings?.qris_url && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>QRIS Pembayaran</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.qris_url}
              alt="QRIS Pembayaran"
              className="h-52 w-auto rounded-lg object-contain sm:h-64"
            />
            <p className="mt-3 text-center text-xs text-slate-500">
              Tunjukkan QR ini ke pelanggan untuk pembayaran
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
