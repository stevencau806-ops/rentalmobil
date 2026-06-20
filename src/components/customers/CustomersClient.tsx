"use client";

import { useState } from "react";
import type { Customer } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface CustomersClientProps {
  initialCustomers: Customer[];
  blacklistNiks: string[];
}

interface FormState {
  id?: string;
  name: string;
  nik: string;
  phone: string;
  address: string;
  ktp_url: string;
}

const emptyForm: FormState = {
  name: "",
  nik: "",
  phone: "",
  address: "",
  ktp_url: "",
};

export function CustomersClient({ initialCustomers, blacklistNiks }: CustomersClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nikWarned, setNikWarned] = useState(false);
  const toast = useToast();

  const isBlacklistedNow = blacklistNiks.includes(form.nik.trim());

  function openAdd() {
    setForm(emptyForm);
    setNikWarned(false);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setForm({
      id: c.id,
      name: c.name,
      nik: c.nik,
      phone: c.phone ?? "",
      address: c.address ?? "",
      ktp_url: c.ktp_url ?? "",
    });
    setNikWarned(false);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      nik: form.nik.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      ktp_url: form.ktp_url.trim() || null,
    };

    const { error } = form.id
      ? await supabase.from("customers").update(payload).eq("id", form.id)
      : await supabase.from("customers").insert(payload);

    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }

    toast(form.id ? "Pelanggan diperbarui" : "Pelanggan ditambahkan", "success");
    setModalOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await createClient()
      .from("customers")
      .delete()
      .eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast(`Gagal menghapus: ${error.message}`, "error");
      return;
    }
    toast("Pelanggan dihapus", "success");
    setDeleteId(null);
    await refresh();
  }

  async function refresh() {
    const { data } = await createClient()
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCustomers(data as Customer[]);
  }

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Nama",
      render: (c) => {
        const blacklisted = blacklistNiks.includes(c.nik);
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{c.name}</span>
            {blacklisted && (
              <Badge tone="red" title="NIK ini berada di blacklist">⚠ Blacklist</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "nik",
      header: "NIK",
      hideOnMobile: true,
      render: (c) => <span className="font-mono text-xs text-slate-600">{c.nik}</span>,
    },
    {
      key: "phone",
      header: "No. HP",
      render: (c) => <span className="text-slate-600">{c.phone ?? "-"}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setDeleteId(c.id)}
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={customers}
        rowKey={(c) => c.id}
        searchKeys={["name", "nik", "phone"]}
        searchPlaceholder="Cari nama, NIK, atau HP..."
        emptyMessage="Belum ada pelanggan."
        toolbar={<Button onClick={openAdd}>+ Tambah Pelanggan</Button>}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Pelanggan" : "Tambah Pelanggan"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Pelanggan"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Budi Santoso"
          />
          <Input
            label="NIK"
            required
            value={form.nik}
            onChange={(e) => {
              setForm({ ...form, nik: e.target.value });
              setNikWarned(false);
            }}
            onBlur={() => setNikWarned(true)}
            placeholder="16 digit NIK"
            error={
              nikWarned && isBlacklistedNow
                ? "⚠ NIK ini terdaftar di BLACKLIST. Pelanggan bermasalah — lanjutkan dengan hati-hati."
                : undefined
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nomor HP"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0812xxxxxxx"
            />
            <Input
              label="URL Foto KTP (opsional)"
              value={form.ktp_url}
              onChange={(e) => setForm({ ...form, ktp_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <Textarea
            label="Alamat"
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Alamat lengkap"
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
        message="Yakin ingin menghapus pelanggan ini?"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
