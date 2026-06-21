"use client";

import { useMemo, useState } from "react";
import type { Booking, Expense, ExpenseType, Car } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import {
  formatRupiah,
  formatTanggal,
  paymentStatusLabel,
  expenseTypeLabel,
  expenseTypeIcon,
} from "@/lib/utils";

interface ReportsClientProps {
  bookings: Booking[];
  expenses: Expense[];
  cars: Car[];
}

type Tab = "monthly" | "yearly" | "commission" | "expense" | "history";

const namaBulan = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function ReportsClient({ bookings, expenses, cars }: ReportsClientProps) {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("monthly");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    bookings.forEach((b) => set.add(new Date(b.start_date).getFullYear()));
    expenses.forEach((e) => set.add(new Date(e.date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [bookings, expenses, now]);

  // ---- Monthly revenue ----
  const monthBookings = bookings.filter((b) => {
    const d = new Date(b.start_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const monthRevenue = monthBookings.reduce(
    (s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0),
    0
  );
  const monthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((s, e) => s + Number(e.amount), 0);
  const monthProfit = monthRevenue - monthExpenses;

  // ---- Yearly revenue ----
  const yearBookings = bookings.filter(
    (b) => new Date(b.start_date).getFullYear() === year
  );
  const yearRevenue = yearBookings.reduce(
    (s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0),
    0
  );
  const yearExpenses = expenses
    .filter((e) => new Date(e.date).getFullYear() === year)
    .reduce((s, e) => s + Number(e.amount), 0);

  // Per-month breakdown for the year
  const monthlyBreakdown = Array.from({ length: 12 }, (_, m) => {
    const rev = bookings
      .filter((b) => {
        const d = new Date(b.start_date);
        return d.getMonth() === m && d.getFullYear() === year;
      })
      .reduce((s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0), 0);
    const exp = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === year;
      })
      .reduce((s, e) => s + Number(e.amount), 0);
    return { month: m, revenue: rev, expense: exp, profit: rev - exp };
  });

  // ---- Expense by category (filtered by year) ----
  const yearExpensesList = expenses.filter(
    (e) => new Date(e.date).getFullYear() === year
  );
  const byCategory = (Object.keys(expenseTypeLabel) as ExpenseType[]).map((t) => ({
    type: t,
    total: yearExpensesList
      .filter((e) => e.type === t)
      .reduce((s, e) => s + Number(e.amount), 0),
    count: yearExpensesList.filter((e) => e.type === t).length,
  }));

  // ---- Commission calculation ----
  // Only from completed bookings (actual_return_date exists) with car that has commission
  const commissionData = useMemo(() => {
    const completedBookings = bookings.filter((b) => b.actual_return_date);
    const monthCommissions = completedBookings
      .filter((b) => {
        const d = new Date(b.actual_return_date!);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .map((b) => {
        const car = cars.find((c) => c.id === b.car_id);
        const percent = car?.commission_percent ?? 0;
        const totalSewa = Number(b.total_cost);
        const commissionAmount = Math.round(totalSewa * percent / 100);
        return {
          booking: b,
          car,
          percent,
          totalSewa,
          commissionAmount,
        };
      })
      .filter((item) => item.percent > 0);

    const yearCommissions = completedBookings
      .filter((b) => new Date(b.actual_return_date!).getFullYear() === year)
      .map((b) => {
        const car = cars.find((c) => c.id === b.car_id);
        const percent = car?.commission_percent ?? 0;
        const totalSewa = Number(b.total_cost);
        const commissionAmount = Math.round(totalSewa * percent / 100);
        return {
          booking: b,
          car,
          percent,
          totalSewa,
          commissionAmount,
        };
      })
      .filter((item) => item.percent > 0);

    const monthTotal = monthCommissions.reduce((s, c) => s + c.commissionAmount, 0);
    const yearTotal = yearCommissions.reduce((s, c) => s + c.commissionAmount, 0);

    return { monthCommissions, yearCommissions, monthTotal, yearTotal };
  }, [bookings, cars, month, year]);

  // Net profit (after commission)
  const monthNetProfit = monthRevenue - monthExpenses - commissionData.monthTotal;
  const yearNetProfit = yearRevenue - yearExpenses - commissionData.yearTotal;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "monthly", label: "Bulanan", icon: "📅" },
    { key: "yearly", label: "Tahunan", icon: "📊" },
    { key: "commission", label: "Admin %", icon: "💰" },
    { key: "expense", label: "Pengeluaran", icon: "💸" },
    { key: "history", label: "Riwayat", icon: "📜" },
  ];

  return (
    <div>
      {/* Filter controls */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Select
          label="Tahun"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-32"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        {(tab === "monthly" || tab === "expense" || tab === "commission") && (
          <Select
            label="Bulan"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-40"
          >
            {namaBulan.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </Select>
        )}
        <Button variant="outline" className="mb-0.5" onClick={() => window.print()}>
          🖨 Cetak
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2 no-print">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-brand-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ===== Monthly ===== */}
      {tab === "monthly" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Laporan Pendapatan — {namaBulan[month]} {year}
          </h2>

          {/* Stat Cards: Pendapatan, Laba Bersih (tengah), Pengeluaran */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Pendapatan" value={formatRupiah(monthRevenue)} icon="💰" tone="green" />
            <StatCard
              label="Laba Bersih"
              value={formatRupiah(monthNetProfit)}
              icon="📈"
              tone={monthNetProfit >= 0 ? "blue" : "red"}
            />
            <StatCard label="Pengeluaran" value={formatRupiah(monthExpenses)} icon="💸" tone="red" />
          </div>

          {/* Mobile: Pendapatan Admin % card (di atas list booking) */}
          {commissionData.monthCommissions.length > 0 && (
            <div className="md:hidden rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-violet-600">Pendapatan Admin %</p>
                  <p className="mt-1 text-2xl font-bold text-violet-800">{formatRupiah(commissionData.monthTotal)}</p>
                </div>
                <span className="text-3xl opacity-80">🤝</span>
              </div>
            </div>
          )}

          {/* Tabel Booking Bulan Ini */}
          {/* Mobile: Card View */}
          <div className="space-y-3 md:hidden">
            {monthBookings.length === 0 ? (
              <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">
                Tidak ada transaksi pada bulan ini.
              </div>
            ) : (
              monthBookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{b.customers?.name}</p>
                      <p className="text-xs text-slate-500">{b.cars?.brand} {b.cars?.model}</p>
                    </div>
                    <Badge tone={b.payment_status === "paid" ? "green" : "yellow"}>
                      {paymentStatusLabel[b.payment_status]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{formatTanggal(b.start_date)}</span>
                    <span className="text-sm font-bold text-slate-900">{formatRupiah(Number(b.total_cost) + Number(b.late_fee || 0))}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block">
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3">Mobil</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada transaksi pada bulan ini.
                        </td>
                      </tr>
                    ) : (
                      monthBookings.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {b.customers?.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {b.cars?.brand} {b.cars?.model}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatTanggal(b.start_date)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatRupiah(Number(b.total_cost) + Number(b.late_fee || 0))}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={b.payment_status === "paid" ? "green" : "yellow"}>
                              {paymentStatusLabel[b.payment_status]}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
          </div>

          {/* Pendapatan Admin % (Komisi) - rincian di bawah */}
          {commissionData.monthCommissions.length > 0 && (
            <div className="space-y-3">
              {/* Desktop: Summary card */}
              <div className="hidden md:block rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-violet-600">Pendapatan Admin %</p>
                    <p className="mt-1 text-2xl font-bold text-violet-800">{formatRupiah(commissionData.monthTotal)}</p>
                  </div>
                  <span className="text-3xl opacity-80">🤝</span>
                </div>
              </div>

              {/* Mobile: Rincian detail */}
              <div className="md:hidden">
                <p className="mb-2 text-xs font-semibold uppercase text-violet-600">Rincian Admin %</p>
                <div className="space-y-2">
                  {commissionData.monthCommissions.map((item) => (
                    <div key={item.booking.id} className="rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.booking.customers?.name}</p>
                          <p className="text-xs text-slate-500">{item.car?.brand} {item.car?.model} · {item.percent}%</p>
                          {item.car?.commission_note && <p className="text-xs text-violet-600">{item.car.commission_note}</p>}
                        </div>
                        <p className="text-sm font-bold text-violet-700">{formatRupiah(item.commissionAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Card>
                  <CardBody className="p-0">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-amber-50 text-xs uppercase text-amber-700">
                        <tr>
                          <th className="px-4 py-3">Pelanggan</th>
                          <th className="px-4 py-3">Mobil</th>
                          <th className="px-4 py-3 text-right">Biaya Sewa</th>
                          <th className="px-4 py-3 text-center">%</th>
                          <th className="px-4 py-3 text-right">Pendapatan Admin</th>
                          <th className="px-4 py-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {commissionData.monthCommissions.map((item) => (
                          <tr key={item.booking.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{item.booking.customers?.name}</td>
                            <td className="px-4 py-3 text-slate-500">{item.car?.brand} {item.car?.model} · {item.car?.plate}</td>
                            <td className="px-4 py-3 text-right">{formatRupiah(item.totalSewa)}</td>
                            <td className="px-4 py-3 text-center"><Badge tone="amber">{item.percent}%</Badge></td>
                            <td className="px-4 py-3 text-right font-bold text-amber-700">{formatRupiah(item.commissionAmount)}</td>
                            <td className="px-4 py-3 text-xs text-slate-400">{item.car?.commission_note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-amber-50 font-bold">
                          <td colSpan={4} className="px-4 py-3 text-right text-amber-800">TOTAL</td>
                          <td className="px-4 py-3 text-right text-amber-800">{formatRupiah(commissionData.monthTotal)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Yearly ===== */}
      {tab === "yearly" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Laporan Tahunan — {year}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Pendapatan" value={formatRupiah(yearRevenue)} icon="💰" tone="green" />
            <StatCard label="Total Pengeluaran" value={formatRupiah(yearExpenses)} icon="💸" tone="red" />
            <StatCard label="Total Komisi" value={formatRupiah(commissionData.yearTotal)} icon="🤝" tone="amber" />
            <StatCard
              label="Laba Bersih"
              value={formatRupiah(yearNetProfit)}
              icon="📈"
              tone={yearNetProfit >= 0 ? "blue" : "red"}
              hint={`${yearBookings.length} transaksi`}
            />
          </div>
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Bulan</th>
                      <th className="px-4 py-3 text-right">Pendapatan</th>
                      <th className="px-4 py-3 text-right">Pengeluaran</th>
                      <th className="px-4 py-3 text-right">Laba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyBreakdown.map((row) => (
                      <tr key={row.month}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {namaBulan[row.month]}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700">
                          {formatRupiah(row.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {formatRupiah(row.expense)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            row.profit >= 0 ? "text-slate-900" : "text-red-600"
                          }`}
                        >
                          {formatRupiah(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {formatRupiah(yearRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatRupiah(yearExpenses)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(yearNetProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ===== Commission ===== */}
      {tab === "commission" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Pendapatan Admin % — {namaBulan[month]} {year}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard label="Total Komisi Bulan Ini" value={formatRupiah(commissionData.monthTotal)} icon="💰" tone="amber" hint={`${commissionData.monthCommissions.length} booking`} />
            <StatCard label="Total Komisi Tahun Ini" value={formatRupiah(commissionData.yearTotal)} icon="📊" tone="amber" hint={`${commissionData.yearCommissions.length} booking`} />
          </div>

          {/* Mobile: Card View */}
          <div className="space-y-3 md:hidden">
            {commissionData.monthCommissions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">
                Tidak ada komisi pada bulan ini.
              </div>
            ) : (
              commissionData.monthCommissions.map((item) => (
                <div key={item.booking.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.booking.customers?.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.car?.brand} {item.car?.model} · {item.car?.plate}
                      </p>
                    </div>
                    <Badge tone="amber">{item.percent}%</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                    <div className="text-xs text-slate-600">
                      <p>Sewa: {formatRupiah(item.totalSewa)}</p>
                      <p className="text-slate-400">{formatTanggal(item.booking.actual_return_date!)}</p>
                    </div>
                    <p className="text-sm font-bold text-amber-700">{formatRupiah(item.commissionAmount)}</p>
                  </div>
                  {item.car?.commission_note && (
                    <p className="mt-2 text-xs text-slate-400">📝 {item.car.commission_note}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block">
            <Card>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Pelanggan</th>
                        <th className="px-4 py-3">Mobil</th>
                        <th className="px-4 py-3">Tgl Kembali</th>
                        <th className="px-4 py-3 text-right">Biaya Sewa</th>
                        <th className="px-4 py-3 text-center">Komisi</th>
                        <th className="px-4 py-3 text-right">Jumlah Komisi</th>
                        <th className="px-4 py-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commissionData.monthCommissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            Tidak ada komisi pada bulan ini.
                          </td>
                        </tr>
                      ) : (
                        commissionData.monthCommissions.map((item) => (
                          <tr key={item.booking.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {item.booking.customers?.name}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {item.car?.brand} {item.car?.model} · {item.car?.plate}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatTanggal(item.booking.actual_return_date!)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatRupiah(item.totalSewa)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge tone="amber">{item.percent}%</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-amber-700">
                              {formatRupiah(item.commissionAmount)}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {item.car?.commission_note || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {commissionData.monthCommissions.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-amber-50 font-bold">
                          <td colSpan={5} className="px-4 py-3 text-right">TOTAL KOMISI</td>
                          <td className="px-4 py-3 text-right text-amber-800">
                            {formatRupiah(commissionData.monthTotal)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ===== Expense ===== */}
      {tab === "expense" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Laporan Pengeluaran — {namaBulan[month]} {year}
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {byCategory.map((cat) => (
              <StatCard
                key={cat.type}
                label={expenseTypeLabel[cat.type]}
                value={formatRupiah(cat.total)}
                icon={expenseTypeIcon[cat.type]}
                tone="red"
                hint={`${cat.count} transaksi`}
              />
            ))}
          </div>
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Keterangan</th>
                      <th className="px-4 py-3 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearExpensesList
                      .filter((e) => new Date(e.date).getMonth() === month)
                      .length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada pengeluaran pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      yearExpensesList
                        .filter((e) => new Date(e.date).getMonth() === month)
                        .map((e) => (
                          <tr key={e.id}>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatTanggal(e.date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="mr-1">{expenseTypeIcon[e.type]}</span>
                              {expenseTypeLabel[e.type]}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{e.description || "-"}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-600">
                              {formatRupiah(Number(e.amount))}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ===== History ===== */}
      {tab === "history" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Riwayat Rental — {year}</h2>
          <Card>
            <CardBody className="p-0">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3 hidden md:table-cell">Mobil</th>
                      <th className="px-4 py-3">Periode</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Belum ada riwayat rental.
                        </td>
                      </tr>
                    ) : (
                      yearBookings.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {b.customers?.name}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                            {b.cars?.brand} {b.cars?.model}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatTanggal(b.start_date)} → {formatTanggal(b.end_date)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatRupiah(Number(b.total_cost) + Number(b.late_fee || 0))}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <Badge tone={b.payment_status === "paid" ? "green" : "yellow"}>
                                {paymentStatusLabel[b.payment_status]}
                              </Badge>
                              {b.actual_return_date ? (
                                <Badge tone="gray">Selesai</Badge>
                              ) : (
                                <Badge tone="blue">Aktif</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
