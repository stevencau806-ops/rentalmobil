"use client";

import { useState } from "react";
import type { Expense, ExpenseType, Car } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
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
  const toast = useToast();

  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

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

  const columns: Column<Expense>[] = [
    {
      key: "type",
      header: "Kategori",
      render: (e) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{expenseTypeIcon[e.type]}</span>
          <Badge tone={e.type === "tax" ? "purple" : e.type === "service" ? "blue" : "gray"}>
            {expenseTypeLabel[e.type]}
          </Badge>
        </div>
      ),
    },
    {
      key: "description",
      header: "Keterangan",
      render: (e) => (
        <div>
          <p className="text-slate-700">{e.description || "-"}</p>
          {e.cars && (
            <p className="text-xs text-slate-400">
              {e.cars.brand} {e.cars.model} · {e.cars.plate}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "date",
      header: "Tanggal",
      hideOnMobile: true,
      render: (e) => <span className="text-xs text-slate-500">{formatTanggal(e.date)}</span>,
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (e) => (
        <span className="font-semibold text-red-600">-{formatRupiah(Number(e.amount))}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (e) => (
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
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <p className="text-xs font-medium uppercase text-red-700">Total Pengeluaran Bulan Ini</p>
        <p className="mt-1 text-2xl font-bold text-red-800">{formatRupiah(totalThisMonth)}</p>
      </Card>

      <DataTable
        columns={columns}
        data={expenses}
        rowKey={(e) => e.id}
        searchKeys={["description"]}
        searchPlaceholder="Cari pengeluaran..."
        emptyMessage="Belum ada pengeluaran tercatat."
        toolbar={<Button onClick={openAdd}>+ Tambah Pengeluaran</Button>}
      />

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
            type="number"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="500000"
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
