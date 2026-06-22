"use client";

import { useMemo, useState } from "react";
import { Trash2, TriangleAlert, Check, Printer, Plus } from "lucide-react";
import type { Booking, Car, Customer, AdditionalFine, FineType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Nota } from "./Nota";
import {
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  hitungDurasiHari,
  hitungDenda,
  paymentStatusLabel,
  fineStatusLabel,
} from "@/lib/utils";

interface BookingClientProps {
  initialBookings: Booking[];
  cars: Car[];
  customers: Customer[];
  finePerHour: number;
  phone: string | null;
  blacklistNiks: string[];
  notaTerms: string | null;
  notaSignatures: string | null;
  qrisUrl: string | null;
  fineTypes: string | null;
}

interface NewBookingForm {
  car_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  notes: string;
}

interface ReturnForm {
  actual_return_date: string;
}

export function BookingClient({
  initialBookings,
  cars,
  customers,
  finePerHour,
  phone,
  blacklistNiks,
  notaTerms,
  notaSignatures,
  qrisUrl,
  fineTypes: fineTypesRaw,
}: BookingClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<NewBookingForm>({
    car_id: "",
    customer_id: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const [returnBooking, setReturnBooking] = useState<Booking | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnForm>({ actual_return_date: "" });
  const [additionalFines, setAdditionalFines] = useState<AdditionalFine[]>([]);
  const [processingReturn, setProcessingReturn] = useState(false);

  const [notaBooking, setNotaBooking] = useState<Booking | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  const availableCars = cars.filter((c) => c.status === "available");

  // Parse fine types from settings
  const DEFAULT_FINE_TYPES: FineType[] = [
    { key: "bbm", label: "Bahan Bakar", emoji: "⛽" },
    { key: "kerusakan", label: "Kerusakan", emoji: "🔧" },
    { key: "lainnya", label: "Lainnya", emoji: "📋" },
  ];
  const fineTypeOptions: FineType[] = useMemo(() => {
    if (!fineTypesRaw) return DEFAULT_FINE_TYPES;
    try {
      const parsed = JSON.parse(fineTypesRaw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FINE_TYPES;
    } catch { return DEFAULT_FINE_TYPES; }
  }, [fineTypesRaw]);

  // Helper: calculate total all fines for a booking
  function getTotalFines(b: Booking): number {
    const lateFee = Number(b.late_fee || 0);
    let additionalTotal = 0;
    if (b.additional_fines) {
      try {
        const fines: AdditionalFine[] = JSON.parse(b.additional_fines);
        additionalTotal = fines.reduce((s, f) => s + (f.amount || 0), 0);
      } catch { /* ignore */ }
    }
    return lateFee + additionalTotal;
  }

  // Filter bookings by search query for mobile card view
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(
      (b) =>
        (b.customers?.name ?? "").toLowerCase().includes(q) ||
        (b.cars?.brand ?? "").toLowerCase().includes(q) ||
        (b.cars?.model ?? "").toLowerCase().includes(q) ||
        (b.cars?.plate ?? "").toLowerCase().includes(q) ||
        (b.notes ?? "").toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  // Live total cost preview for new booking
  const costPreview = useMemo(() => {
    const car = cars.find((c) => c.id === newForm.car_id);
    if (!car || !newForm.start_date || !newForm.end_date) return null;
    const days = hitungDurasiHari(newForm.start_date, newForm.end_date);
    return { days, total: days * Number(car.tariff_per_day) };
  }, [cars, newForm]);

  const selectedCustomerBlacklisted =
    newForm.customer_id &&
    blacklistNiks.includes(
      customers.find((c) => c.id === newForm.customer_id)?.nik ?? ""
    );

  // ---- New booking submit ----
  async function handleNewBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.car_id || !newForm.customer_id || !newForm.start_date || !newForm.end_date) {
      toast("Lengkapi semua field wajib", "error");
      return;
    }
    const car = cars.find((c) => c.id === newForm.car_id);
    if (!car) return;
    const days = hitungDurasiHari(newForm.start_date, newForm.end_date);
    const totalCost = days * Number(car.tariff_per_day);

    setSaving(true);
    const { error } = await createClient().from("bookings").insert({
      car_id: newForm.car_id,
      customer_id: newForm.customer_id,
      start_date: newForm.start_date,
      end_date: newForm.end_date,
      duration_days: days,
      total_cost: totalCost,
      late_fee: 0,
      fine_status: "none",
      payment_status: "unpaid",
      notes: newForm.notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Booking berhasil dibuat", "success");
    setNewOpen(false);
    setNewForm({ car_id: "", customer_id: "", start_date: "", end_date: "", notes: "" });
    await refresh();
  }

  // ---- Toggle payment status ----
  async function togglePayment(b: Booking) {
    const next = b.payment_status === "paid" ? "unpaid" : "paid";
    const { error } = await createClient()
      .from("bookings")
      .update({ payment_status: next })
      .eq("id", b.id);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast(`Pembayaran: ${next === "paid" ? "Lunas" : "Belum Bayar"}`, "success");
    await refresh();
  }

  // ---- Open return modal ----
  function openReturn(b: Booking) {
    setReturnBooking(b);
    const defaultDate = b.actual_return_date
      ? new Date(b.actual_return_date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);
    setReturnForm({ actual_return_date: defaultDate });
    // Load existing additional fines if any
    try {
      const existing = b.additional_fines ? JSON.parse(b.additional_fines) : [];
      setAdditionalFines(Array.isArray(existing) ? existing : []);
    } catch {
      setAdditionalFines([]);
    }
  }

  // ---- Process return + compute late fee ----
  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnBooking) return;
    const actualReturn = returnForm.actual_return_date;
    if (!actualReturn) {
      toast("Pilih tanggal & jam pengembalian", "error");
      return;
    }

    // Combine booking end_date (date) as end-of-day for comparison
    const endDateTime = new Date(returnBooking.end_date);
    endDateTime.setHours(23, 59, 0, 0);

    const { hoursLate, fee } = hitungDenda(actualReturn, endDateTime.toISOString(), finePerHour);

    // Calculate total additional fines
    const validFines = additionalFines.filter((f) => f.amount > 0 && f.label.trim());
    const totalAdditionalFines = validFines.reduce((sum, f) => sum + f.amount, 0);
    const hasFines = fee > 0 || totalAdditionalFines > 0;

    setProcessingReturn(true);
    const { error } = await createClient()
      .from("bookings")
      .update({
        actual_return_date: actualReturn,
        late_fee: fee,
        additional_fines: validFines.length > 0 ? JSON.stringify(validFines) : null,
        fine_status: hasFines ? "pending" : "none",
      })
      .eq("id", returnBooking.id);
    setProcessingReturn(false);

    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }

    if (hasFines) {
      const totalDenda = fee + totalAdditionalFines;
      toast(`Pengembalian tercatat. Total denda: ${formatRupiah(totalDenda)}`, "info");
    } else {
      toast("Pengembalian tepat waktu. Tidak ada denda.", "success");
    }
    setReturnBooking(null);
    setAdditionalFines([]);
    await refresh();
  }

  // ---- Settle late fee (mark fine as paid) ----
  async function settleFine(b: Booking) {
    const { error } = await createClient()
      .from("bookings")
      .update({ fine_status: "paid" })
      .eq("id", b.id);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Denda ditandai lunas", "success");
    await refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await createClient().from("bookings").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Booking dihapus", "success");
    setDeleteId(null);
    await refresh();
  }

  async function refresh() {
    const { data } = await createClient()
      .from("bookings")
      .select("*, cars(brand, model, plate, tariff_per_day), customers(name, nik, phone)")
      .order("created_at", { ascending: false });
    if (data) setBookings(data as Booking[]);
  }

  // ---- Share to WhatsApp ----
  function shareToWhatsApp(b: Booking) {
    const customerPhone = b.customers?.phone;
    const lateFee = Number(b.late_fee || 0);
    let additionalTotal = 0;
    let additionalLines = "";
    if (b.additional_fines) {
      try {
        const fines: AdditionalFine[] = JSON.parse(b.additional_fines);
        fines.forEach((f) => {
          additionalTotal += f.amount || 0;
          additionalLines += `• Denda ${f.label}: ${formatRupiah(f.amount)}\n`;
        });
      } catch { /* ignore */ }
    }
    const totalFines = lateFee + additionalTotal;
    const grandTotal = Number(b.total_cost) + totalFines;

    const text = [
      `📄 *NOTA SEWA MOBIL*`,
      `_Erlangga Rental Mobil_`,
      `━━━━━━━━━━━━━━━`,
      ``,
      `*Pelanggan:* ${b.customers?.name ?? "-"}`,
      `*Mobil:* ${b.cars?.brand} ${b.cars?.model} (${b.cars?.plate})`,
      `*Periode:* ${formatTanggal(b.start_date)} → ${formatTanggal(b.end_date)} (${b.duration_days} hari)`,
      ``,
      `━━━━━━━━━━━━━━━`,
      `*Sewa:* ${formatRupiah(Number(b.total_cost))}`,
      lateFee > 0 ? `*Denda Terlambat:* ${formatRupiah(lateFee)}` : "",
      additionalLines.trim(),
      `━━━━━━━━━━━━━━━`,
      `*TOTAL: ${formatRupiah(grandTotal)}*`,
      `*Status:* ${b.payment_status === "paid" ? "✅ LUNAS" : "⏳ BELUM BAYAR"}`,
      ``,
      `Terima kasih telah menyewa di Erlangga Rental Mobil 🙏`,
    ]
      .filter((line) => line !== "")
      .join("\n");

    // Format phone number for WA
    let waPhone = "";
    if (customerPhone) {
      waPhone = customerPhone.replace(/[^0-9]/g, "");
      if (waPhone.startsWith("0")) {
        waPhone = "62" + waPhone.slice(1);
      }
    }

    const waUrl = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, "_blank");
  }

  const columns: Column<Booking>[] = [
    {
      key: "customer",
      header: "Pelanggan",
      render: (b) => (
        <div>
          <p className="font-medium text-slate-900">{b.customers?.name ?? "-"}</p>
          <p className="text-xs text-slate-500">{b.cars?.brand} {b.cars?.model} · {b.cars?.plate}</p>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Periode",
      hideOnMobile: true,
      render: (b) => (
        <div className="text-xs text-slate-600">
          <p>{formatTanggal(b.start_date)} →</p>
          <p>{formatTanggal(b.end_date)}</p>
          <p className="text-slate-400">{b.duration_days} hari</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (b) => {
        const totalFines = getTotalFines(b);
        return (
          <div>
            <p className="font-semibold text-slate-900">
              {formatRupiah(Number(b.total_cost) + totalFines)}
            </p>
            {totalFines > 0 && (
              <p className="text-xs text-red-600">+{formatRupiah(totalFines)} denda</p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <div className="flex flex-col items-start gap-1">
          <button onClick={() => togglePayment(b)} title="Klik untuk ubah">
            <span className={`rounded px-2.5 py-1 text-xs font-bold text-white ${b.payment_status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`}>
              {b.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
            </span>
          </button>
          {!b.actual_return_date && <Badge tone="blue">Sewa Aktif</Badge>}
          {b.actual_return_date && b.fine_status === "pending" && (
            <button onClick={() => settleFine(b)}>
              <span className="rounded px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700">Denda: Perlu Dibayar</span>
            </button>
          )}
          {b.actual_return_date && b.fine_status === "paid" && (
            <Badge tone="gray">Selesai</Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (b) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          {!b.actual_return_date && (
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => openReturn(b)}>
              Selesaikan
            </Button>
          )}
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setNotaBooking(b)}>
            Nota
          </Button>
          <Button
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => setDeleteId(b.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Search + toolbar - mobile only */}
      <div className="mb-3 flex flex-col gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari booking..."
            />
          </div>
          <Button onClick={() => setNewOpen(true)}>+ Booking Baru</Button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {filteredBookings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Belum ada booking. Klik &apos;Booking Baru&apos; untuk memulai.
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Header: customer + price */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {b.customers?.name ?? "-"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {b.cars?.brand} {b.cars?.model} · {b.cars?.plate}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">
                    {formatRupiah(Number(b.total_cost) + getTotalFines(b))}
                  </p>
                  {getTotalFines(b) > 0 && (
                    <p className="text-[11px] text-red-600">+{formatRupiah(getTotalFines(b))} denda</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
                <span>{formatTanggal(b.start_date)} → {formatTanggal(b.end_date)}</span>
                <span className="text-slate-400">({b.duration_days} hari)</span>
              </div>

              {/* Status badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <button onClick={() => togglePayment(b)} title="Klik untuk ubah">
                  <span className={`rounded px-2.5 py-1 text-xs font-bold text-white ${b.payment_status === "paid" ? "bg-emerald-500" : "bg-amber-500"}`}>
                    {b.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
                  </span>
                </button>
                {!b.actual_return_date && <Badge tone="blue">Sewa Aktif</Badge>}
                {b.actual_return_date && b.fine_status === "pending" && (
                  <button onClick={() => settleFine(b)}>
                    <span className="rounded px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700">Denda: Perlu Dibayar</span>
                  </button>
                )}
                {b.actual_return_date && b.fine_status === "paid" && (
                  <Badge tone="gray">Selesai</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                {!b.actual_return_date && (
                  <Button size="sm" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => openReturn(b)}>
                    Selesaikan
                  </Button>
                )}
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setNotaBooking(b)}>
                  Nota
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setDeleteId(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
        <p className="text-xs text-slate-400">
          Menampilkan {filteredBookings.length} dari {bookings.length} data
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={bookings}
          rowKey={(b) => b.id}
          searchKeys={["notes"]}
          searchPlaceholder="Cari booking..."
          emptyMessage="Belum ada booking. Klik 'Booking Baru' untuk memulai."
          toolbar={<Button onClick={() => setNewOpen(true)}>+ Booking Baru</Button>}
        />
      </div>

      {/* New Booking Modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Booking Rental Baru" size="lg">
        <form onSubmit={handleNewBooking} className="space-y-4">
          <Select
            label="Pilih Mobil"
            required
            value={newForm.car_id}
            onChange={(e) => setNewForm({ ...newForm, car_id: e.target.value })}
          >
            <option value="">— Pilih mobil tersedia —</option>
            {availableCars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.model} ({c.plate}) — {formatRupiah(Number(c.tariff_per_day))}/hari
              </option>
            ))}
          </Select>
          {availableCars.length === 0 && cars.length > 0 && (
            <p className="text-xs text-amber-600">
              Semua mobil sedang disewa. Selesaikan booking aktif terlebih dahulu.
            </p>
          )}

          <Select
            label="Pilih Pelanggan"
            required
            value={newForm.customer_id}
            onChange={(e) => setNewForm({ ...newForm, customer_id: e.target.value })}
          >
            <option value="">— Pilih pelanggan —</option>
            {customers.map((c) => {
              const bl = blacklistNiks.includes(c.nik);
              return (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.nik}{bl ? "  [BLACKLIST]" : ""}
                </option>
              );
            })}
          </Select>
          {selectedCustomerBlacklisted && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <TriangleAlert className="mt-px h-4 w-4 shrink-0" />
              <span>PERINGATAN: Pelanggan ini terdaftar di BLACKLIST. Lanjutkan dengan sangat hati-hati.</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Tanggal Sewa"
              type="date"
              required
              value={newForm.start_date}
              onChange={(e) => setNewForm({ ...newForm, start_date: e.target.value })}
            />
            <Input
              label="Tanggal Kembali"
              type="date"
              required
              value={newForm.end_date}
              min={newForm.start_date}
              onChange={(e) => setNewForm({ ...newForm, end_date: e.target.value })}
            />
          </div>

          {costPreview && (
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-brand-700">Durasi</span>
                <span className="font-medium">{costPreview.days} hari</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-brand-700">Total Biaya</span>
                <span className="text-lg font-bold text-brand-900">
                  {formatRupiah(costPreview.total)}
                </span>
              </div>
            </div>
          )}

          <Textarea
            label="Catatan (opsional)"
            rows={2}
            value={newForm.notes}
            onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
            placeholder="Catatan tambahan..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || availableCars.length === 0}>
              {saving ? "Menyimpan..." : "Buat Booking"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal
        open={!!returnBooking}
        onClose={() => setReturnBooking(null)}
        title="Selesaikan Sewa & Hitung Denda"
        size="md"
      >
        {returnBooking && (
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">
                {returnBooking.customers?.name} — {returnBooking.cars?.brand} {returnBooking.cars?.model}
              </p>
              <p className="text-xs text-slate-500">
                Jatuh tempo: {formatTanggal(returnBooking.end_date)} (23:59)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Denda keterlambatan: {formatRupiah(finePerHour)}/jam
              </p>
            </div>

            <Input
              label="Tanggal & Jam Pengembalian Aktual"
              type="datetime-local"
              required
              value={returnForm.actual_return_date}
              onChange={(e) => setReturnForm({ actual_return_date: e.target.value })}
            />

            {returnForm.actual_return_date && (() => {
              const endDateTime = new Date(returnBooking.end_date);
              endDateTime.setHours(23, 59, 0, 0);
              const { hoursLate, fee } = hitungDenda(
                returnForm.actual_return_date,
                endDateTime.toISOString(),
                finePerHour
              );
              return (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    fee > 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {fee > 0 ? (
                    <>
                      <p className="font-semibold">Terlambat {hoursLate} jam</p>
                      <p>Denda keterlambatan: {formatRupiah(fee)}</p>
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Check className="h-4 w-4 text-emerald-600" />
                      Tepat waktu — tidak ada denda keterlambatan
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Additional Fines */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Denda Tambahan</p>
                <button
                  type="button"
                  onClick={() => setAdditionalFines([...additionalFines, { type: fineTypeOptions[0]?.key ?? "lainnya", label: fineTypeOptions[0]?.label ?? "", amount: 0 }])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Denda
                </button>
              </div>

              {additionalFines.length === 0 && (
                <p className="mt-3 text-center text-xs text-slate-400">Tidak ada denda tambahan.</p>
              )}

              <div className="mt-3 space-y-3">
                {additionalFines.map((fine, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={fine.type}
                        onChange={(e) => {
                          const updated = [...additionalFines];
                          const type = e.target.value;
                          const matched = fineTypeOptions.find((ft) => ft.key === type);
                          updated[i] = {
                            ...updated[i],
                            type,
                            label: matched?.label ?? updated[i].label,
                          };
                          setAdditionalFines(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        {fineTypeOptions.map((ft) => (
                          <option key={ft.key} value={ft.key}>{ft.emoji} {ft.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setAdditionalFines(additionalFines.filter((_, idx) => idx !== i))}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Keterangan (mis: BBM kurang 2 bar)"
                      value={fine.label}
                      onChange={(e) => {
                        const updated = [...additionalFines];
                        updated[i] = { ...updated[i], label: e.target.value };
                        setAdditionalFines(updated);
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400"
                    />
                    <div className="mt-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={fine.amount || ""}
                        onChange={(e) => {
                          const updated = [...additionalFines];
                          updated[i] = { ...updated[i], amount: Number(e.target.value) || 0 };
                          setAdditionalFines(updated);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {additionalFines.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                  <span className="text-xs font-medium text-red-700">Total Denda Tambahan</span>
                  <span className="text-sm font-bold text-red-700">
                    {formatRupiah(additionalFines.reduce((s, f) => s + (f.amount || 0), 0))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReturnBooking(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={processingReturn}>
                {processingReturn ? "Memproses..." : "Konfirmasi Pengembalian"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Nota Modal */}
      <Modal open={!!notaBooking} onClose={() => setNotaBooking(null)} title="Nota Sewa" size="lg">
        {notaBooking && <Nota booking={notaBooking} phone={phone} notaTerms={notaTerms} notaSignatures={notaSignatures} />}
        {notaBooking && (
          <div className="mt-4 flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={() => setNotaBooking(null)}>
              Tutup
            </Button>
            <Button variant="outline" onClick={() => shareToWhatsApp(notaBooking)}>
              <span className="inline-flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.1 1.511 5.828L0 24l6.335-1.652A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.89 0-3.69-.508-5.27-1.45l-.378-.224-3.91 1.02 1.042-3.8-.247-.393A9.77 9.77 0 012.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/></svg>
                Share WA
              </span>
            </Button>
            <Button onClick={() => {
              const notaEl = document.getElementById("nota-print-area");
              if (!notaEl) return;

              // Create hidden iframe for printing (works on mobile)
              const iframe = document.createElement("iframe");
              iframe.style.position = "fixed";
              iframe.style.top = "-9999px";
              iframe.style.left = "-9999px";
              iframe.style.width = "210mm";
              iframe.style.height = "297mm";
              document.body.appendChild(iframe);

              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              if (!doc) { document.body.removeChild(iframe); return; }

              doc.open();
              doc.write(`<!DOCTYPE html><html><head><title>Nota Sewa</title><style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 6mm; font-size: 12px; line-height: 1.4; color: #1e293b; margin: 0; }
                * { box-sizing: border-box; }
                .flex { display: flex; } .flex-col { flex-direction: column; } .items-center { align-items: center; } .justify-between { justify-content: space-between; }
                .grid { display: grid; } .grid-cols-3 { grid-template-columns: repeat(3, 1fr); } .grid-cols-2 { grid-template-columns: repeat(2, 1fr); } .gap-2 { gap: 0.5rem; }
                .text-center { text-align: center; } .text-right { text-align: right; }
                .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
                .text-sm { font-size: 11px; } .text-xs { font-size: 10px; } .text-\\[12px\\] { font-size: 12px; } .text-\\[11px\\] { font-size: 11px; } .text-\\[10px\\] { font-size: 10px; } .text-\\[9px\\] { font-size: 9px; }
                .uppercase { text-transform: uppercase; } .leading-snug { line-height: 1.3; } .leading-tight { line-height: 1.2; }
                .text-slate-400 { color: #94a3b8; } .text-slate-500 { color: #64748b; } .text-slate-600 { color: #475569; } .text-slate-700 { color: #334155; } .text-slate-900 { color: #0f172a; }
                .text-red-500 { color: #ef4444; } .text-red-600 { color: #dc2626; } .text-white { color: #fff; }
                .bg-emerald-500 { background: #10b981; } .bg-amber-500 { background: #f59e0b; } .bg-slate-50 { background: #f8fafc; }
                .border-b { border-bottom: 1px solid #e2e8f0; } .border-t-2 { border-top: 2px solid #1e293b; } .border { border: 1px solid #e2e8f0; } .border-slate-200 { border-color: #e2e8f0; } .border-slate-300 { border-color: #cbd5e1; } .border-slate-400 { border-color: #94a3b8; } .border-slate-800 { border-color: #1e293b; }
                .rounded { border-radius: 0.25rem; } .rounded-lg { border-radius: 0.5rem; }
                .p-1\\.5 { padding: 0.375rem; } .p-2 { padding: 0.5rem; } .p-4 { padding: 1rem; } .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; } .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; } .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; } .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; } .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
                .pb-2 { padding-bottom: 0.5rem; } .pl-3 { padding-left: 0.75rem; }
                .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; } .mt-3 { margin-top: 0.75rem; } .mb-0\\.5 { margin-bottom: 0.125rem; } .mb-1 { margin-bottom: 0.25rem; }
                .w-full { width: 100%; } .w-24 { width: 6rem; } .w-auto { width: auto; } .h-10 { height: 2.5rem; }
                .inline-block { display: inline-block; } .object-contain { object-fit: contain; }
                .divide-y > * + * { border-top: 1px solid #f1f5f9; }
                .space-y-0 > * + * { margin-top: 0; }
                .list-decimal { list-style-type: decimal; }
                table { width: 100%; border-collapse: collapse; }
                .mt-10 { margin-top: 2.5rem; }
                @page { size: A4; margin: 8mm; }
              </style></head><body>${notaEl.innerHTML}</body></html>`);
              doc.close();

              iframe.onload = () => {
                setTimeout(() => {
                  iframe.contentWindow?.print();
                  setTimeout(() => document.body.removeChild(iframe), 1000);
                }, 300);
              };
            }}>
              <span className="inline-flex items-center gap-1.5">
                <Printer className="h-4 w-4" />
                Cetak / PDF
              </span>
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Yakin ingin menghapus booking ini? Mobil akan dikembalikan ke status tersedia."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
