"use client";

import { useState, useMemo } from "react";
import { TriangleAlert, Trash2, Search } from "lucide-react";
import type { Blacklist, Customer } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
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
  const [viewReason, setViewReason] = useState<Blacklist | null>(null);
  const [query, setQuery] = useState("");
  const toast = useToast();

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (b) =>
        b.nik.toLowerCase().includes(q) ||
        b.reason.toLowerCase().includes(q) ||
        (b.customers?.name ?? "").toLowerCase().includes(q)
    );
  }, [list, query]);

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

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase opacity-90">Total Blacklist</p>
            <p className="mt-1 text-3xl font-bold">{list.length} Pelanggan</p>
          </div>
          <span className="text-4xl opacity-80">🚫</span>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, NIK, atau alasan..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <Button variant="danger" onClick={openAdd}>+ Tambah Blacklist</Button>
      </div>

      {/* Card List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
            <p className="text-2xl mb-2">🚫</p>
            <p className="text-sm font-medium text-slate-500">Belum ada pelanggan di blacklist</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
                    {(b.customers?.name ?? b.nik)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {b.customers?.name ?? "(Tidak terdaftar)"}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{b.nik}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{formatTanggal(b.created_at)}</span>
              </div>

              <p className="mt-2 text-xs text-slate-600 line-clamp-2">{b.reason}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setViewReason(b)}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-2 text-xs font-semibold text-white hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 transition-all"
                >
                  Lihat Detail
                </button>
                <button
                  onClick={() => setDeleteId(b.id)}
                  className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-slate-400">
        Menampilkan {filtered.length} dari {list.length} data
      </p>

      {/* Add Modal */}
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
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <TriangleAlert className="mt-px h-4 w-4 shrink-0" />
            <span>Pelanggan dengan NIK ini akan otomatis mendapat peringatan saat dibuat/diedit di halaman Data Pelanggan.</span>
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

      {/* Detail Modal - Colorful */}
      <Modal open={!!viewReason} onClose={() => setViewReason(null)} title="Detail Blacklist" size="md">
        {viewReason && (
          <div className="space-y-3">
            {/* Pelanggan - Red gradient */}
            <div className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white">
              <p className="text-[10px] font-bold uppercase opacity-80">Pelanggan Diblokir</p>
              <p className="text-lg font-bold mt-0.5">{viewReason.customers?.name ?? "(Tidak terdaftar)"}</p>
              <p className="text-xs opacity-90 mt-0.5">NIK: {viewReason.nik}</p>
              {viewReason.customers?.phone && (
                <p className="text-xs opacity-90">HP: {viewReason.customers.phone}</p>
              )}
            </div>

            {/* Alasan - Orange gradient */}
            <div className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
              <p className="text-[10px] font-bold uppercase opacity-80">Alasan Blacklist</p>
              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{viewReason.reason}</p>
            </div>

            {/* Tanggal - Slate */}
            <div className="rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 p-3 text-white">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase opacity-80">Tanggal Diblokir</p>
                <p className="text-sm font-semibold">{formatTanggal(viewReason.created_at)}</p>
              </div>
            </div>

            <button
              onClick={() => setViewReason(null)}
              className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Tutup
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
