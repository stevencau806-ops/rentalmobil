"use client";

import { useState } from "react";
import type { Blacklist, Customer } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatTanggal } from "@/lib/utils";

interface BlacklistClientProps {
  initialList: Blacklist[];
  customers: Customer[];
}

interface FormState {
  customer_id: string;
  nik: string;
  reason: string;
}

export function BlacklistClient({ initialList, customers }: BlacklistClientProps) {
  const [list, setList] = useState<Blacklist[]>(initialList);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ customer_id: "", nik: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  function openAdd() {
    setForm({ customer_id: "", nik: "", reason: "" });
    setModalOpen(true);
  }

  function handleSelectCustomer(id: string) {
    const c = customers.find((x) => x.id === id);
    setForm({
      customer_id: id,
      nik: id && c ? c.nik : form.nik,
      reason: form.reason,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nik.trim() || !form.reason.trim()) {
      toast("NIK dan alasan wajib diisi", "error");
      return;
    }
    setSaving(true);
    const { error } = await createClient().from("blacklist").insert({
      customer_id: form.customer_id || null,
      nik: form.nik.trim(),
      reason: form.reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Pelanggan ditambahkan ke blacklist", "success");
    setModalOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await createClient()
      .from("blacklist")
      .delete()
      .eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Dihapus dari blacklist", "success");
    setDeleteId(null);
    await refresh();
  }

  async function refresh() {
    const { data } = await createClient()
      .from("blacklist")
      .select("*, customers(name, phone)")
      .order("created_at", { ascending: false });
    if (data) setList(data as Blacklist[]);
  }

  const columns: Column<Blacklist>[] = [
    {
      key: "nik",
      header: "NIK",
      render: (b) => (
        <span className="font-mono text-xs font-semibold text-red-600">{b.nik}</span>
      ),
    },
    {
      key: "name",
      header: "Nama",
      render: (b) => (
        <span className="font-medium text-slate-900">
          {b.customers?.name ?? "(Tidak terdaftar)"}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Alasan",
      render: (b) => (
        <span className="text-slate-600 line-clamp-2">{b.reason}</span>
      ),
    },
    {
      key: "created_at",
      header: "Tanggal",
      hideOnMobile: true,
      render: (b) => <span className="text-xs text-slate-500">{formatTanggal(b.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (b) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50"
          onClick={() => setDeleteId(b.id)}
        >
          Hapus
        </Button>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={list}
        rowKey={(b) => b.id}
        searchKeys={["nik", "reason"]}
        searchPlaceholder="Cari NIK atau alasan..."
        emptyMessage="Belum ada pelanggan di blacklist."
        toolbar={<Button variant="danger" onClick={openAdd}>+ Tambah Blacklist</Button>}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah ke Blacklist"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Pilih Pelanggan (opsional)"
            value={form.customer_id}
            onChange={(e) => handleSelectCustomer(e.target.value)}
            hint="Pilih dari daftar pelanggan, atau isi NIK manual di bawah."
          >
            <option value="">— Manual / Tidak terdaftar —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.nik}
              </option>
            ))}
          </Select>
          <Input
            label="NIK"
            required
            value={form.nik}
            onChange={(e) => setForm({ ...form, nik: e.target.value })}
            placeholder="16 digit NIK"
          />
          <Textarea
            label="Alasan Blacklist"
            required
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Contoh: Tidak mengembalikan mobil, merusak kendaraan, dll."
          />
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠ Pelanggan dengan NIK ini akan otomatis mendapat peringatan saat dibuat/diedit di halaman Data Pelanggan.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? "Menyimpan..." : "Tambah ke Blacklist"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Hapus dari Blacklist"
        message="Hapus NIK ini dari blacklist? Pelanggan dengan NIK ini tidak akan lagi diperingatkan."
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
