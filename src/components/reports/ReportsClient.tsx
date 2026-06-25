"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { Booking, Expense, ExpenseType, Car, AdditionalFine } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import {
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  paymentStatusLabel,
  expenseTypeLabel,
  expenseTypeIcon,
} from "@/lib/utils";

interface ReportsClientProps {
  bookings: Booking[];
  expenses: Expense[];
  cars: Car[];
}

type Tab = "monthly" | "yearly" | "car" | "commission" | "expense" | "history";

const namaBulan = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function ReportsClient({ bookings, expenses, cars }: ReportsClientProps) {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("monthly");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [selectedCar, setSelectedCar] = useState<{ car: Car; bookings: Booking[] } | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

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

    function calcDenda(b: typeof bookings[0]): number {
      let denda = Number(b.late_fee || 0);
      if (b.additional_fines) {
        try {
          const fines = JSON.parse(b.additional_fines) as { amount: number }[];
          denda += fines.reduce((s, f) => s + (f.amount || 0), 0);
        } catch { /* ignore */ }
      }
      return denda;
    }

    const monthCommissions = completedBookings
      .filter((b) => {
        const d = new Date(b.actual_return_date!);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .map((b) => {
        const car = cars.find((c) => c.id === b.car_id);
        const percent = car?.commission_percent ?? 0;
        const totalSewa = Number(b.total_cost);
        const totalDenda = calcDenda(b);
        const commissionSewa = Math.round(totalSewa * percent / 100);
        const commissionDenda = Math.round(totalDenda * percent / 100);
        const commissionAmount = commissionSewa + commissionDenda;
        return {
          booking: b,
          car,
          percent,
          totalSewa,
          totalDenda,
          commissionSewa,
          commissionDenda,
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
        const totalDenda = calcDenda(b);
        const commissionSewa = Math.round(totalSewa * percent / 100);
        const commissionDenda = Math.round(totalDenda * percent / 100);
        const commissionAmount = commissionSewa + commissionDenda;
        return {
          booking: b,
          car,
          percent,
          totalSewa,
          totalDenda,
          commissionSewa,
          commissionDenda,
          commissionAmount,
        };
      })
      .filter((item) => item.percent > 0);

    const monthTotal = monthCommissions.reduce((s, c) => s + c.commissionAmount, 0);
    const yearTotal = yearCommissions.reduce((s, c) => s + c.commissionAmount, 0);

    return { monthCommissions, yearCommissions, monthTotal, yearTotal };
  }, [bookings, cars, month, year]);


  // ---- Car performance stats (monthly) ----
  const monthCarStats = useMemo(() => {
    return cars
      .map((car) => {
        const carBookings = monthBookings.filter((b) => b.car_id === car.id);
        const totalRevenue = carBookings.reduce(
          (s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0),
          0
        );
        const commissionPercent = Number(car.commission_percent || 0);
        const totalCommission = carBookings
          .filter((b) => b.actual_return_date)
          .reduce((s, b) => {
            const cost = Number(b.total_cost);
            const late = Number(b.late_fee || 0);
            let fines = 0;
            if (b.additional_fines) {
              try {
                const parsed = JSON.parse(b.additional_fines) as { amount: number }[];
                fines = parsed.reduce((x, f) => x + (f.amount || 0), 0);
              } catch { /* ignore */ }
            }
            return s + Math.round((cost + late + fines) * commissionPercent / 100);
          }, 0);
        return {
          car,
          totalRevenue,
          totalCommission,
          bookingCount: carBookings.length,
        };
      })
      .filter((c) => c.bookingCount > 0);
  }, [cars, monthBookings]);

  // ---- Car performance stats (yearly) ----
  const yearCarStats = useMemo(() => {
    return cars
      .map((car) => {
        const carBookings = yearBookings.filter((b) => b.car_id === car.id);
        const totalRevenue = carBookings.reduce(
          (s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0),
          0
        );
        const commissionPercent = Number(car.commission_percent || 0);
        const totalCommission = carBookings
          .filter((b) => b.actual_return_date)
          .reduce((s, b) => {
            const cost = Number(b.total_cost);
            const late = Number(b.late_fee || 0);
            let fines = 0;
            if (b.additional_fines) {
              try {
                const parsed = JSON.parse(b.additional_fines) as { amount: number }[];
                fines = parsed.reduce((x, f) => x + (f.amount || 0), 0);
              } catch { /* ignore */ }
            }
            return s + Math.round((cost + late + fines) * commissionPercent / 100);
          }, 0);
        return {
          car,
          totalRevenue,
          totalCommission,
          bookingCount: carBookings.length,
        };
      })
      .filter((c) => c.bookingCount > 0);
  }, [cars, yearBookings]);

  // Colorful solid backgrounds for car cards (not gradients)
  const carColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-lime-500",
    "bg-red-500",
  ];

  // ---- Print per-car report in nota style ----
  function printCarReport(car: Car) {
    const carBookings = bookings.filter((b) => {
      const d = new Date(b.start_date);
      return b.car_id === car.id && d.getMonth() === month && d.getFullYear() === year;
    });
    const carExpensesList = expenses.filter((e) => {
      const d = new Date(e.date);
      return e.car_id === car.id && d.getMonth() === month && d.getFullYear() === year;
    });
    const carRevenue = carBookings.reduce((s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0), 0);
    const carExpensesTotal = carExpensesList.reduce((s, e) => s + Number(e.amount), 0);

    // Commission calculation for this car
    const commissionPercent = car.commission_percent ?? 0;
    const commissionBookings = carBookings.filter((b) => b.actual_return_date);
    const commissionDetails = commissionBookings.map((b) => {
      const totalSewa = Number(b.total_cost);
      let totalDenda = Number(b.late_fee || 0);
      if (b.additional_fines) {
        try {
          const fines = JSON.parse(b.additional_fines) as { amount: number }[];
          totalDenda += fines.reduce((s, f) => s + (f.amount || 0), 0);
        } catch { /* */ }
      }
      const commissionAmount = Math.round((totalSewa + totalDenda) * commissionPercent / 100);
      return { booking: b, totalSewa, totalDenda, commissionAmount };
    });
    const totalCommission = commissionDetails.reduce((s, c) => s + c.commissionAmount, 0);
    const carProfit = carRevenue - carExpensesTotal - totalCommission;

    const bookingRows = carBookings.map((b) => {
      const total = Number(b.total_cost) + Number(b.late_fee || 0);
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${formatTanggal(b.start_date)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${b.customers?.name ?? "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:center;">${b.duration_days} hari</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;font-weight:600;">${formatRupiah(total)}</td>
      </tr>`;
    }).join("");

    const expenseRows = carExpensesList.map((e) => {
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${formatTanggal(e.date)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${expenseTypeIcon[e.type]} ${expenseTypeLabel[e.type]}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${e.description || "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:right;font-weight:600;color:#dc2626;">${formatRupiah(Number(e.amount))}</td>
      </tr>`;
    }).join("");

    const commissionRows = commissionPercent > 0 ? commissionDetails.map((c) => {
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #ede9fe;font-size:12px;">${formatTanggal(c.booking.start_date)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ede9fe;font-size:12px;">${c.booking.customers?.name ?? "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ede9fe;font-size:12px;text-align:right;">${formatRupiah(c.totalSewa + c.totalDenda)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ede9fe;font-size:12px;text-align:center;font-weight:600;">${commissionPercent}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ede9fe;font-size:12px;text-align:right;font-weight:600;color:#7c3aed;">${formatRupiah(c.commissionAmount)}</td>
      </tr>`;
    }).join("") : "";

    const html = `<!DOCTYPE html><html><head><title>Laporan ${car.brand} ${car.model} - ${namaBulan[month]} ${year}</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; padding: 8mm; font-size: 13px; line-height: 1.5; color: #0f172a; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      * { box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; }
      @page { size: A4; margin: 10mm; }
    </style></head><body>
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h1 style="margin:0;font-size:18px;font-weight:700;">Laporan Keuangan Mobil</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#475569;">Erlangga Rental Mobil</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0;font-size:11px;color:#64748b;">Periode</p>
            <p style="margin:2px 0 0;font-size:14px;font-weight:700;">${namaBulan[month]} ${year}</p>
          </div>
        </div>
      </div>

      <!-- Identitas Mobil -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px;">
        <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;">Identitas Kendaraan</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;">${car.brand} ${car.model}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#334155;">Plat: ${car.plate} &nbsp;|&nbsp; Tahun: ${car.year ?? "-"} &nbsp;|&nbsp; Tarif: ${formatRupiah(car.tariff_per_day)}/hari</p>
        ${commissionPercent > 0 ? `<p style="margin:4px 0 0;font-size:11px;color:#7c3aed;font-weight:600;">&#9733; Potongan Admin: ${commissionPercent}% ${car.commission_note ? "— " + car.commission_note : ""}</p>` : ""}
      </div>

      <!-- Ringkasan -->
      <div style="display:grid;grid-template-columns:${commissionPercent > 0 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr"};gap:10px;margin-bottom:16px;">
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#047857;">Pendapatan</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#065f46;">${formatRupiah(carRevenue)}</p>
          <p style="margin:2px 0 0;font-size:10px;color:#047857;">${carBookings.length} transaksi</p>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#b91c1c;">Pengeluaran</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#991b1b;">${formatRupiah(carExpensesTotal)}</p>
          <p style="margin:2px 0 0;font-size:10px;color:#b91c1c;">${carExpensesList.length} transaksi</p>
        </div>
        ${commissionPercent > 0 ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#6d28d9;">Admin ${commissionPercent}%</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#5b21b6;">${formatRupiah(totalCommission)}</p>
          <p style="margin:2px 0 0;font-size:10px;color:#6d28d9;">${commissionBookings.length} booking</p>
        </div>` : ""}
        <div style="background:${carProfit >= 0 ? "#eff6ff" : "#fef2f2"};border:1px solid ${carProfit >= 0 ? "#bfdbfe" : "#fecaca"};border-radius:8px;padding:12px;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:${carProfit >= 0 ? "#1d4ed8" : "#b91c1c"};">${carProfit >= 0 ? "Laba Bersih" : "Rugi"}</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${carProfit >= 0 ? "#1e40af" : "#991b1b"};">${formatRupiah(carProfit)}</p>
        </div>
      </div>

      <!-- Detail Pendapatan -->
      <div style="margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#334155;">Detail Pendapatan (Sewa)</p>
        ${carBookings.length === 0
          ? '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px 0;">Tidak ada transaksi sewa periode ini.</p>'
          : `<table>
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Tanggal</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Pelanggan</th>
                <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Durasi</th>
                <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Total</th>
              </tr>
            </thead>
            <tbody>${bookingRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #0f172a;">
                <td colspan="3" style="padding:8px;text-align:right;font-weight:700;font-size:12px;">TOTAL PENDAPATAN</td>
                <td style="padding:8px;text-align:right;font-weight:700;font-size:14px;color:#065f46;">${formatRupiah(carRevenue)}</td>
              </tr>
            </tfoot>
          </table>`
        }
      </div>

      <!-- Detail Pengeluaran -->
      <div style="margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#334155;">Detail Pengeluaran</p>
        ${carExpensesList.length === 0
          ? '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px 0;">Tidak ada pengeluaran periode ini.</p>'
          : `<table>
            <thead>
              <tr style="background:#fef2f2;">
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#b91c1c;border-bottom:2px solid #fecaca;">Tanggal</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#b91c1c;border-bottom:2px solid #fecaca;">Kategori</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#b91c1c;border-bottom:2px solid #fecaca;">Keterangan</th>
                <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#b91c1c;border-bottom:2px solid #fecaca;">Jumlah</th>
              </tr>
            </thead>
            <tbody>${expenseRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #991b1b;">
                <td colspan="3" style="padding:8px;text-align:right;font-weight:700;font-size:12px;color:#991b1b;">TOTAL PENGELUARAN</td>
                <td style="padding:8px;text-align:right;font-weight:700;font-size:14px;color:#991b1b;">${formatRupiah(carExpensesTotal)}</td>
              </tr>
            </tfoot>
          </table>`
        }
      </div>

      ${commissionPercent > 0 ? `
      <!-- Potongan Admin -->
      <div style="margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#5b21b6;">Detail Potongan Admin (${commissionPercent}%)</p>
        ${commissionDetails.length === 0
          ? '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:16px 0;">Belum ada booking selesai periode ini.</p>'
          : `<table>
            <thead>
              <tr style="background:#f5f3ff;">
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#6d28d9;border-bottom:2px solid #ddd6fe;">Tanggal</th>
                <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#6d28d9;border-bottom:2px solid #ddd6fe;">Pelanggan</th>
                <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#6d28d9;border-bottom:2px solid #ddd6fe;">Total Sewa</th>
                <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:#6d28d9;border-bottom:2px solid #ddd6fe;">%</th>
                <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#6d28d9;border-bottom:2px solid #ddd6fe;">Potongan</th>
              </tr>
            </thead>
            <tbody>${commissionRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #5b21b6;">
                <td colspan="4" style="padding:8px;text-align:right;font-weight:700;font-size:12px;color:#5b21b6;">TOTAL POTONGAN ADMIN</td>
                <td style="padding:8px;text-align:right;font-weight:700;font-size:14px;color:#5b21b6;">${formatRupiah(totalCommission)}</td>
              </tr>
            </tfoot>
          </table>`
        }
      </div>` : ""}

      <!-- Footer -->
      <div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:20px;">
        <p style="margin:0;font-size:10px;color:#64748b;text-align:center;">
          Laporan dicetak: ${formatTanggalWaktu(new Date().toISOString())} &nbsp;|&nbsp; Erlangga Rental Mobil
        </p>
      </div>
      <script>
        (function() {
          function tryPrint() {
            if (document.readyState === "complete") {
              setTimeout(function() { window.print(); }, 400);
            } else {
              window.addEventListener("load", function() {
                setTimeout(function() { window.print(); }, 400);
              });
            }
          }
          tryPrint();
        })();
      </script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
      // Fallback: open via anchor if popup blocked
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.click();
    }
    // Revoke blob after 60s
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "monthly", label: "Bulanan", icon: "📅" },
    { key: "yearly", label: "Tahunan", icon: "📊" },
    { key: "car", label: "Per Mobil", icon: "🚗" },
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
          onChange={(e) => { setYear(Number(e.target.value)); setTxPage(1); setAdminPage(1); }}
          className="w-32"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        {(tab === "monthly" || tab === "expense" || tab === "commission" || tab === "car") && (
          <Select
            label="Bulan"
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setTxPage(1); setAdminPage(1); }}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Laporan — {namaBulan[month]} {year}
            </h2>
            <p className="text-xs text-slate-400">
              Data dari booking yang sudah selesai
            </p>
          </div>

          {/* Stat Cards with hints */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              label="Pendapatan"
              value={formatRupiah(monthRevenue)}
              icon="💰"
              tone="green"
              hint={monthBookings.length > 0 ? `${monthBookings.length} transaksi` : "Belum ada transaksi"}
            />
            <StatCard
              label="Pengeluaran"
              value={formatRupiah(monthExpenses)}
              icon="💸"
              tone="red"
              hint="Service, pajak, BBM, dll"
            />
          </div>

          {/* Car Performance Cards */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Ringkasan per Mobil — {namaBulan[month]} {year}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {monthCarStats.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
                  Belum ada data mobil pada bulan ini.
                </div>
              ) : (
                monthCarStats.map((item, idx) => {
                  const colorClass = carColors[idx % carColors.length];
                  return (
                    <div
                      key={item.car.id}
                      className={`cursor-pointer rounded-2xl ${colorClass} p-4 text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]`}
                      onClick={() =>
                        setSelectedCar({
                          car: item.car,
                          bookings: monthBookings.filter((b) => b.car_id === item.car.id),
                        })
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">
                            {item.car.brand} {item.car.model}
                          </p>
                          <p className="text-[11px] opacity-90">{item.car.plate}</p>
                        </div>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                          {item.bookingCount}x sewa
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="opacity-90">Pendapatan</span>
                          <span className="font-bold">{formatRupiah(item.totalRevenue)}</span>
                        </div>
                        {item.car.commission_percent > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="opacity-90">Admin</span>
                            <span className="font-bold">{formatRupiah(item.totalCommission)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mobile: Pendapatan Admin % card */}
          {commissionData.monthCommissions.length > 0 && (
            <div className="md:hidden rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-violet-600">Pendapatan Admin %</p>
                  <p className="mt-1 text-2xl font-bold text-violet-800">{formatRupiah(commissionData.monthTotal)}</p>
                  <p className="text-xs text-violet-500 mt-0.5">Komisi dari {commissionData.monthCommissions.length} booking mobil titipan</p>
                </div>
                <span className="text-3xl opacity-80">🤝</span>
              </div>
            </div>
          )}

          {/* Daftar Transaksi */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Daftar Transaksi {namaBulan[month]} {year}
            </h3>

            {/* Mobile: Card View */}
            <div className="space-y-3 md:hidden">
              {monthBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm font-medium text-slate-500">Belum ada transaksi bulan ini</p>
                  <p className="text-xs text-slate-400 mt-1">Transaksi akan muncul setelah ada booking yang selesai</p>
                </div>
              ) : (
                <>
                  {monthBookings.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE).map((b) => {
                    const totalWithFine = Number(b.total_cost) + Number(b.late_fee || 0);
                    return (
                      <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{b.customers?.name}</p>
                            <p className="text-xs text-slate-500">{b.cars?.brand} {b.cars?.model} · {b.cars?.plate}</p>
                          </div>
                          <Badge tone={b.payment_status === "paid" ? "green" : "yellow"}>
                            {paymentStatusLabel[b.payment_status]}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <div className="text-slate-400">
                            <p>{formatTanggal(b.start_date)} → {formatTanggal(b.end_date)}</p>
                            <p>{b.duration_days} hari</p>
                          </div>
                          <span className="text-base font-bold text-slate-900">{formatRupiah(totalWithFine)}</span>
                        </div>
                        <button
                          onClick={() => setDetailBooking(b)}
                          className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    );
                  })}
                  {/* Pagination */}
                  {monthBookings.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-slate-400">{txPage}/{Math.ceil(monthBookings.length / ITEMS_PER_PAGE)} halaman</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                          disabled={txPage === 1}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => setTxPage((p) => Math.min(Math.ceil(monthBookings.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={txPage >= Math.ceil(monthBookings.length / ITEMS_PER_PAGE)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
                      <th className="px-4 py-3">Tanggal Sewa</th>
                      <th className="px-4 py-3 text-center">Durasi</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Belum ada transaksi bulan ini. Data muncul setelah booking diselesaikan.
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
                            {formatTanggal(b.start_date)} → {formatTanggal(b.end_date)}
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            {b.duration_days} hari
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
                  {commissionData.monthCommissions.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">
                      Tidak ada komisi pada bulan ini.
                    </div>
                  ) : (
                    <>
                      {commissionData.monthCommissions.slice((adminPage - 1) * ITEMS_PER_PAGE, adminPage * ITEMS_PER_PAGE).map((item) => (
                        <div key={item.booking.id} className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.booking.customers?.name}</p>
                              <p className="text-xs text-slate-500">{item.car?.brand} {item.car?.model} · {item.car?.plate}</p>
                              {item.car?.commission_note && <p className="text-xs text-violet-600 mt-0.5">📝 {item.car.commission_note}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-violet-700">{formatRupiah(item.commissionAmount)}</p>
                              <span className="inline-block rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white">{item.percent}%</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setDetailBooking(item.booking)}
                            className="mt-2 w-full rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-700 active:bg-violet-800 transition-colors"
                          >
                            Lihat Detail
                          </button>
                        </div>
                      ))}
                      {/* Pagination */}
                      {commissionData.monthCommissions.length > ITEMS_PER_PAGE && (
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-slate-400">{adminPage}/{Math.ceil(commissionData.monthCommissions.length / ITEMS_PER_PAGE)} halaman</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                              disabled={adminPage === 1}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
                            >
                              ← Prev
                            </button>
                            <button
                              onClick={() => setAdminPage((p) => Math.min(Math.ceil(commissionData.monthCommissions.length / ITEMS_PER_PAGE), p + 1))}
                              disabled={adminPage >= Math.ceil(commissionData.monthCommissions.length / ITEMS_PER_PAGE)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total Pendapatan" value={formatRupiah(yearRevenue)} icon="💰" tone="green" />
            <StatCard label="Total Pengeluaran" value={formatRupiah(yearExpenses)} icon="💸" tone="red" />
            <StatCard label="Total Komisi" value={formatRupiah(commissionData.yearTotal)} icon="🤝" tone="amber" />
          </div>

          {/* Car Performance Cards */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Ringkasan per Mobil — {year}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {yearCarStats.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
                  Belum ada data mobil pada tahun ini.
                </div>
              ) : (
                yearCarStats.map((item, idx) => {
                  const colorClass = carColors[idx % carColors.length];
                  return (
                    <div
                      key={item.car.id}
                      className={`cursor-pointer rounded-2xl ${colorClass} p-4 text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]`}
                      onClick={() =>
                        setSelectedCar({
                          car: item.car,
                          bookings: yearBookings.filter((b) => b.car_id === item.car.id),
                        })
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">
                            {item.car.brand} {item.car.model}
                          </p>
                          <p className="text-[11px] opacity-90">{item.car.plate}</p>
                        </div>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                          {item.bookingCount}x sewa
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="opacity-90">Pendapatan</span>
                          <span className="font-bold">{formatRupiah(item.totalRevenue)}</span>
                        </div>
                        {item.car.commission_percent > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="opacity-90">Admin</span>
                            <span className="font-bold">{formatRupiah(item.totalCommission)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Sewa: {formatRupiah(item.totalSewa)}</span>
                      <span className="font-semibold text-amber-700">{formatRupiah(item.commissionSewa)}</span>
                    </div>
                    {item.totalDenda > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-600">Denda: {formatRupiah(item.totalDenda)}</span>
                        <span className="font-semibold text-red-600">{formatRupiah(item.commissionDenda)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-amber-200 pt-1">
                      <span className="text-xs text-slate-400">{formatTanggal(item.booking.actual_return_date!)}</span>
                      <span className="text-sm font-bold text-amber-800">{formatRupiah(item.commissionAmount)}</span>
                    </div>
                  </div>
                  {item.car?.commission_note && (
                    <p className="mt-2 text-xs text-slate-400">📝 {item.car.commission_note}</p>
                  )}
                  <button
                    onClick={() => setDetailBooking(item.booking)}
                    className="mt-2 w-full rounded-lg bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700 active:bg-amber-800 transition-colors"
                  >
                    Lihat Detail
                  </button>
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
                        <th className="px-4 py-3 text-right">Denda</th>
                        <th className="px-4 py-3 text-center">%</th>
                        <th className="px-4 py-3 text-right">Komisi Sewa</th>
                        <th className="px-4 py-3 text-right">Komisi Denda</th>
                        <th className="px-4 py-3 text-right">Total Komisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commissionData.monthCommissions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
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
                              {item.car?.brand} {item.car?.model}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatTanggal(item.booking.actual_return_date!)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatRupiah(item.totalSewa)}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {item.totalDenda > 0 ? formatRupiah(item.totalDenda) : "-"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge tone="amber">{item.percent}%</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-amber-700">
                              {formatRupiah(item.commissionSewa)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-red-600">
                              {item.commissionDenda > 0 ? formatRupiah(item.commissionDenda) : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-amber-800">
                              {formatRupiah(item.commissionAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {commissionData.monthCommissions.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-amber-50 font-bold">
                          <td colSpan={6} className="px-4 py-3 text-right">TOTAL KOMISI</td>
                          <td className="px-4 py-3 text-right text-amber-700">
                            {formatRupiah(commissionData.monthCommissions.reduce((s, c) => s + c.commissionSewa, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600">
                            {formatRupiah(commissionData.monthCommissions.reduce((s, c) => s + c.commissionDenda, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-800">
                            {formatRupiah(commissionData.monthTotal)}
                          </td>
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

      {/* ===== Per Mobil ===== */}
      {tab === "car" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Laporan Per Mobil — {namaBulan[month]} {year}
          </h2>
          <p className="text-xs text-slate-500">Klik tombol cetak/download untuk mencetak laporan tiap mobil dalam format nota.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car, idx) => {
              const carBookings = monthBookings.filter((b) => b.car_id === car.id);
              const carRevenue = carBookings.reduce((s, b) => s + Number(b.total_cost) + Number(b.late_fee || 0), 0);
              const carExpenses = expenses
                .filter((e) => {
                  const d = new Date(e.date);
                  return e.car_id === car.id && d.getMonth() === month && d.getFullYear() === year;
                })
                .reduce((s, e) => s + Number(e.amount), 0);
              const carProfit = carRevenue - carExpenses;
              const colors = [
                "from-blue-500 to-blue-600",
                "from-emerald-500 to-emerald-600",
                "from-purple-500 to-purple-600",
                "from-orange-500 to-orange-600",
                "from-rose-500 to-rose-600",
                "from-teal-500 to-teal-600",
                "from-indigo-500 to-indigo-600",
                "from-amber-500 to-amber-600",
                "from-cyan-500 to-cyan-600",
                "from-pink-500 to-pink-600",
              ];
              const gradient = colors[idx % colors.length];

              return (
                <div key={car.id} className={`rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-md`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold opacity-80">{car.plate}</p>
                      <p className="text-base font-bold">{car.brand} {car.model}</p>
                    </div>
                    <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{carBookings.length} sewa</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-80">Pendapatan</span>
                      <span className="font-bold">{formatRupiah(carRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">Pengeluaran</span>
                      <span className="font-bold">{formatRupiah(carExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/30 pt-1">
                      <span className="font-semibold">Laba/Rugi</span>
                      <span className="font-bold">{formatRupiah(carProfit)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => printCarReport(car)}
                    className="mt-3 w-full rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 py-2 text-xs font-semibold text-white transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Cetak / Download
                  </button>
                </div>
              );
            })}
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

      {/* Detail Booking Modal - Colorful */}
      <Modal open={!!detailBooking} onClose={() => setDetailBooking(null)} title="Detail Transaksi" size="lg">
        {detailBooking && (() => {
          const b = detailBooking;
          const lateFee = Number(b.late_fee || 0);
          let fines: AdditionalFine[] = [];
          try { fines = b.additional_fines ? JSON.parse(b.additional_fines) : []; } catch { /* */ }
          const finesTotal = fines.reduce((s, f) => s + (f.amount || 0), 0);
          const grandTotal = Number(b.total_cost) + lateFee + finesTotal;
          const car = cars.find((c) => c.id === b.car_id);
          const commissionPercent = car?.commission_percent ?? 0;
          const commissionAmount = Math.round(grandTotal * commissionPercent / 100);

          return (
            <div className="space-y-3 text-sm">
              {/* Status */}
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${b.payment_status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`}>
                  {b.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${b.actual_return_date ? "bg-slate-500" : "bg-blue-500"}`}>
                  {b.actual_return_date ? "SELESAI" : "BERJALAN"}
                </span>
              </div>

              {/* Pelanggan */}
              <div className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 p-3 text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">Pelanggan</p>
                <p className="text-base font-bold">{b.customers?.name ?? "-"}</p>
                <p className="text-xs opacity-90">NIK: {b.customers?.nik ?? "-"} · HP: {b.customers?.phone ?? "-"}</p>
              </div>

              {/* Kendaraan */}
              <div className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-3 text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">Kendaraan</p>
                <p className="text-base font-bold">{b.cars?.brand} {b.cars?.model}</p>
                <p className="text-xs opacity-90">Plat: {b.cars?.plate} · Tarif: {formatRupiah(b.cars?.tariff_per_day ?? 0)}/hari</p>
              </div>

              {/* Periode */}
              <div className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-3 text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">Periode Sewa</p>
                <p className="font-bold">{formatTanggal(b.start_date)} → {formatTanggal(b.end_date)} ({b.duration_days} hari)</p>
                {b.actual_return_date && <p className="text-xs opacity-90 mt-0.5">Dikembalikan: {formatTanggalWaktu(b.actual_return_date)}</p>}
              </div>

              {/* Rincian Biaya */}
              <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">Rincian Biaya</p>
                <div className="mt-1 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Sewa {b.duration_days} hari × {formatRupiah(b.cars?.tariff_per_day ?? 0)}</span>
                    <span className="font-bold">{formatRupiah(Number(b.total_cost))}</span>
                  </div>
                  {lateFee > 0 && (
                    <div className="flex justify-between bg-white/20 rounded px-2 py-0.5">
                      <span>Denda Keterlambatan</span>
                      <span className="font-bold">{formatRupiah(lateFee)}</span>
                    </div>
                  )}
                  {fines.map((f, i) => (
                    <div key={i} className="flex justify-between bg-white/20 rounded px-2 py-0.5">
                      <span>Denda: {f.label || f.type}</span>
                      <span className="font-bold">{formatRupiah(f.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-white/40 pt-1 text-sm font-bold">
                    <span>TOTAL</span>
                    <span>{formatRupiah(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Komisi Admin */}
              {commissionPercent > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 p-3 text-white">
                  <p className="text-[10px] font-bold uppercase opacity-80">Komisi Admin ({commissionPercent}%)</p>
                  <p className="text-lg font-black mt-0.5">{formatRupiah(commissionAmount)}</p>
                  {car?.commission_note && <p className="text-xs opacity-80 mt-0.5">📝 {car.commission_note}</p>}
                </div>
              )}

              {b.notes && (
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Catatan</p>
                  <p className="text-slate-700">{b.notes}</p>
                </div>
              )}

              <button
                onClick={() => setDetailBooking(null)}
                className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Car Rental History Modal */}
      <Modal open={!!selectedCar} onClose={() => setSelectedCar(null)} title="Riwayat Rental Mobil" size="lg">
        {selectedCar && (() => {
          const { car, bookings: carBookings } = selectedCar;
          return (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-100 p-3 text-sm">
                <p className="font-bold">{car.brand} {car.model}</p>
                <p className="text-xs text-slate-500">{car.plate}</p>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Pelanggan</th>
                      <th className="px-3 py-2">Tanggal Sewa</th>
                      <th className="px-3 py-2 text-center">Durasi</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          Tidak ada data rental untuk mobil ini.
                        </td>
                      </tr>
                    ) : (
                      carBookings.map((b) => (
                        <tr key={b.id}>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {b.customers?.name}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {formatTanggal(b.start_date)} → {formatTanggal(b.end_date)}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {b.duration_days} hari
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatRupiah(Number(b.total_cost) + Number(b.late_fee || 0))}
                          </td>
                          <td className="px-3 py-2">
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

              {/* Mobile Card View */}
              <div className="space-y-2 md:hidden">
                {carBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        {b.customers?.name}
                      </p>
                      <Badge tone={b.payment_status === "paid" ? "green" : "yellow"}>
                        {paymentStatusLabel[b.payment_status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatTanggal(b.start_date)} → {formatTanggal(b.end_date)} · {b.duration_days} hari
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {formatRupiah(Number(b.total_cost) + Number(b.late_fee || 0))}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedCar(null)}
                className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
