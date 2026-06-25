"use client";

import { useState, useMemo } from "react";
import { Trash2, Pencil, Plus, ChevronLeft } from "lucide-react";
import type { Expense, ExpenseType, Car } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/Card";
import {
  formatRupiah,
  formatTanggal,
  expenseTypeLabel,
  expenseTypeIcon,
} from "@/lib/utils";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  cars: Car[];
}

interface FormState {
  id?: string;
  type: ExpenseType;
  car_id: string;
  amount: string;
  description: string;
  date: string;
}

function formatNumber(value: string): string {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("id-ID");
}

function parseNumber(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

// Assign consistent gradient colors to each car
const CAR_COLORS = [
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

export function ExpensesClient({ initialExpenses, cars }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [form, setForm] = useState<FormState>({
    type: "service",
    car_id: "",
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Group expenses by car_id
  const expensesByCar = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const car of cars) {
      map[car.id] = [];
    }
    map["__no_car__"] = [];
    for (const e of expenses) {
      if (e.car_id && map[e.car_id]) {
        map[e.car_id].push(e);
      } else {
        map["__no_car__"].push(e);
      }
    }
    return map;
  }, [expenses, cars]);

  // Car expense totals
  const carTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const car of cars) {
      totals[car.id] = (expensesByCar[car.id] || []).reduce((s, e) => s + Number(e.amount), 0);
    }
    return totals;
  }, [cars, expensesByCar]);

  // Selected car expenses
  const selectedCarExpenses = selectedCar ? (expensesByCar[selectedCar.id] || []) : [];

  function openAdd(carId?: string) {
    setForm({
      type: "service",
      car_id: carId || "",
      amount: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(e: Expense) {
    setForm({
      id: e.id,
      type: e.type,
      car_id: e.car_id ?? "",
      amount: e.amount?.toString() ?? "",
      description: e.description ?? "",
      date: e.date,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      type: form.type,
      car_id: form.car_id || null,
      amount: Number(form.amount) || 0,
      description: form.description.trim() || null,
      date: form.date,
    };
    const { error } = form.id
      ? await createClient().from("expenses").update(payload).eq("id", form.id)
      : await createClient().from("expenses").insert(payload);
    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast(form.id ? "Pengeluaran diperbarui" : "Pengeluaran ditambahkan", "success");
    setModalOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await createClient().from("expenses").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Pengeluaran dihapus", "success");
    setDeleteId(null);
    await refresh();
  }

  async function refresh() {
    const { data } = await createClient()
      .from("expenses")
      .select("*, cars(brand, model, plate)")
      .order("date", { ascending: false });
    if (data) setExpenses(data as Expense[]);
  }

  // Detail view for a selected car
  if (selectedCar) {
    const colorIdx = cars.findIndex((c) => c.id === selectedCar.id) % CAR_COLORS.length;
    const gradient = CAR_COLORS[colorIdx];
    const totalExpense = carTotals[selectedCar.id] || 0;

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setSelectedCar(null)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke daftar mobil
        </button>

        {/* Car info header */}
        <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase opacity-80">Riwayat Pengeluaran</p>
              <p className="mt-1 text-xl font-bold">{selectedCar.brand} {selectedCar.model}</p>
              <p className="text-sm opacity-90">Plat: {selectedCar.plate}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80">Total Pengeluaran</p>
              <p className="text-2xl font-bold">{formatRupiah(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* Add button */}
        <div className="flex justify-end">
          <Button onClick={() => openAdd(selectedCar.id)}>
            <Plus className="mr-1 h-4 w-4" /> Tambah Pengeluaran
          </Button>
        </div>

        {/* Expense history list */}
        <div className="space-y-3">
          {selectedCarExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm font-medium text-slate-500">Belum ada pengeluaran untuk mobil ini</p>
              <p className="text-xs text-slate-400 mt-1">Tambahkan pengeluaran pertama dengan tombol di atas</p>
            </div>
          ) : (
            selectedCarExpenses.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{expenseTypeIcon[e.type]}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {expenseTypeLabel[e.type]}
                      </p>
                      <p className="text-xs text-slate-500">{formatTanggal(e.date)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-600">
                    -{formatRupiah(Number(e.amount))}
                  </p>
                </div>

                {e.description && (
                  <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{e.description}</p>
                )}

                <div className="mt-3 flex justify-end gap-1">
                  <button
                    onClick={() => openEdit(e)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(e.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={form.id ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Kategori"
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ExpenseType })}
            >
              {(Object.keys(expenseTypeLabel) as ExpenseType[]).map((t) => (
                <option key={t} value={t}>
                  {expenseTypeIcon[t]} {expenseTypeLabel[t]}
                </option>
              ))}
            </Select>
            <Input
              label="Jumlah (Rp)"
              type="text"
              inputMode="numeric"
              required
              value={formatNumber(form.amount)}
              onChange={(e) => setForm({ ...form, amount: parseNumber(e.target.value) })}
              placeholder="500.000"
            />
            <Input
              label="Tanggal"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Select
              label="Mobil Terkait"
              value={form.car_id}
              onChange={(e) => setForm({ ...form, car_id: e.target.value })}
            >
              <option value="">— Tidak terkait mobil —</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} ({c.plate})
                </option>
              ))}
            </Select>
            <Textarea
              label="Keterangan"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detail pengeluaran..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          open={!!deleteId}
          message="Yakin ingin menghapus pengeluaran ini?"
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
          loading={deleting}
        />
      </div>
    );
  }

  // Main view: Car grid + summary
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase opacity-90">Total Pengeluaran Bulan Ini</p>
            <p className="mt-1 text-3xl font-bold">{formatRupiah(totalThisMonth)}</p>
          </div>
          <span className="text-4xl opacity-80">💸</span>
        </div>
      </Card>

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => openAdd()}>
          <Plus className="mr-1 h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </div>

      {/* Car Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Pilih Mobil untuk Lihat Riwayat Pengeluaran</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cars.map((car, idx) => {
            const gradient = CAR_COLORS[idx % CAR_COLORS.length];
            const total = carTotals[car.id] || 0;
            const count = (expensesByCar[car.id] || []).length;

            return (
              <button
                key={car.id}
                onClick={() => setSelectedCar(car)}
                className={`rounded-2xl bg-gradient-to-br ${gradient} p-4 text-left text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                <p className="text-xs font-semibold opacity-80 truncate">{car.plate}</p>
                <p className="mt-1 text-sm font-bold truncate">{car.brand} {car.model}</p>
                <div className="mt-3 border-t border-white/30 pt-2">
                  <p className="text-xs opacity-80">{count} pengeluaran</p>
                  <p className="text-base font-bold">{formatRupiah(total)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pengeluaran tanpa mobil */}
      {(expensesByCar["__no_car__"] || []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Pengeluaran Umum (Tidak Terkait Mobil)</h3>
          <div className="space-y-3">
            {expensesByCar["__no_car__"].map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{expenseTypeIcon[e.type]}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {expenseTypeLabel[e.type]}
                      </p>
                      <p className="text-xs text-slate-500">{formatTanggal(e.date)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-600">
                    -{formatRupiah(Number(e.amount))}
                  </p>
                </div>

                {e.description && (
                  <p className="mt-2 text-xs text-slate-600">{e.description}</p>
                )}

                <div className="mt-3 flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(e)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(e.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Kategori"
            required
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as ExpenseType })}
          >
            {(Object.keys(expenseTypeLabel) as ExpenseType[]).map((t) => (
              <option key={t} value={t}>
                {expenseTypeIcon[t]} {expenseTypeLabel[t]}
              </option>
            ))}
          </Select>
          <Input
            label="Jumlah (Rp)"
            type="text"
            inputMode="numeric"
            required
            value={formatNumber(form.amount)}
            onChange={(e) => setForm({ ...form, amount: parseNumber(e.target.value) })}
            placeholder="500.000"
          />
          <Input
            label="Tanggal"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Select
            label="Mobil Terkait (opsional)"
            value={form.car_id}
            onChange={(e) => setForm({ ...form, car_id: e.target.value })}
          >
            <option value="">— Tidak terkait mobil —</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.model} ({c.plate})
              </option>
            ))}
          </Select>
          <Textarea
            label="Keterangan"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Detail pengeluaran..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Yakin ingin menghapus pengeluaran ini?"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
