"use client";

import { useState, useMemo } from "react";
import { Trash2, Pencil } from "lucide-react";
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

export function ExpensesClient({ initialExpenses, cars }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [modalOpen, setModalOpen] = useState(false);
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
  const [query, setQuery] = useState("");
  const toast = useToast();

  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const filtered = useMemo(() => {
    if (!query.trim()) return expenses;
    const q = query.toLowerCase();
    return expenses.filter(
      (e) =>
        (e.description ?? "").toLowerCase().includes(q) ||
        expenseTypeLabel[e.type].toLowerCase().includes(q) ||
        (e.cars ? `${e.cars.brand} ${e.cars.model} ${e.cars.plate}`.toLowerCase().includes(q) : false)
    );
  }, [expenses, query]);

  function openAdd() {
    setForm({
      type: "service",
      car_id: "",
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

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <p className="text-xs font-medium uppercase text-red-700">Total Pengeluaran Bulan Ini</p>
        <p className="mt-1 text-2xl font-bold text-red-800">{formatRupiah(totalThisMonth)}</p>
      </Card>

      {/* Search + Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pengeluaran..."
          />
        </div>
        <Button onClick={openAdd}>+ Tambah Pengeluaran</Button>
      </div>

      {/* Mobile: Card View */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-400">
            Belum ada pengeluaran tercatat.
          </div>
        ) : (
          filtered.map((e) => (
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
                    {e.cars && (
                      <p className="text-xs text-slate-500">
                        {e.cars.brand} {e.cars.model} · {e.cars.plate}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600">
                  -{formatRupiah(Number(e.amount))}
                </p>
              </div>

              {e.description && (
                <p className="mt-2 text-xs text-slate-600">{e.description}</p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{formatTanggal(e.date)}</span>
                <div className="flex gap-1">
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
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Kategori</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Keterangan</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Tanggal</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Jumlah</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Belum ada pengeluaran tercatat.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{expenseTypeIcon[e.type]}</span>
                        <Badge tone={e.type === "tax" ? "purple" : e.type === "service" ? "blue" : e.type === "commission" ? "amber" : "gray"}>
                          {expenseTypeLabel[e.type]}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-slate-700">{e.description || "-"}</p>
                        {e.cars && (
                          <p className="text-xs text-slate-400">
                            {e.cars.brand} {e.cars.model} · {e.cars.plate}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">{formatTanggal(e.date)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-red-600">-{formatRupiah(Number(e.amount))}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(e.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Menampilkan {filtered.length} dari {expenses.length} data
      </p>

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
