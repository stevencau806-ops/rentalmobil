"use client";

import { useState } from "react";
import { Car as CarIcon } from "lucide-react";
import type { Car, CarStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, statusMobilLabel } from "@/lib/utils";

interface CarsClientProps {
  initialCars: Car[];
}

interface FormState {
  id?: string;
  brand: string;
  model: string;
  plate: string;
  year: string;
  tariff_per_day: string;
  status: CarStatus;
  photo_url: string;
}

const emptyForm: FormState = {
  brand: "",
  model: "",
  plate: "",
  year: "",
  tariff_per_day: "",
  status: "available",
  photo_url: "",
};

export function CarsClient({ initialCars }: CarsClientProps) {
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(car: Car) {
    setForm({
      id: car.id,
      brand: car.brand,
      model: car.model,
      plate: car.plate,
      year: car.year?.toString() ?? "",
      tariff_per_day: car.tariff_per_day?.toString() ?? "",
      status: car.status,
      photo_url: car.photo_url ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      plate: form.plate.trim().toUpperCase(),
      year: form.year ? Number(form.year) : null,
      tariff_per_day: Number(form.tariff_per_day) || 0,
      status: form.status,
      photo_url: form.photo_url.trim() || null,
    };

    const { error } = form.id
      ? await supabase.from("cars").update(payload).eq("id", form.id)
      : await supabase.from("cars").insert(payload);

    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }

    toast(form.id ? "Mobil diperbarui" : "Mobil ditambahkan", "success");
    setModalOpen(false);
    await refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await createClient().from("cars").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast(`Gagal menghapus: ${error.message}`, "error");
      return;
    }
    toast("Mobil dihapus", "success");
    setDeleteId(null);
    await refresh();
  }

  async function toggleStatus(car: Car) {
    const next: CarStatus = car.status === "available" ? "rented" : "available";
    const { error } = await createClient()
      .from("cars")
      .update({ status: next })
      .eq("id", car.id);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast(`Status diubah ke "${statusMobilLabel[next]}"`, "success");
    await refresh();
  }

  async function refresh() {
    const { data } = await createClient()
      .from("cars")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCars(data as Car[]);
  }

  const columns: Column<Car>[] = [
    {
      key: "car",
      header: "Mobil",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
            {c.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.photo_url}
                alt={`${c.brand} ${c.model}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <CarIcon className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">
              {c.brand} {c.model}
            </p>
            <p className="text-xs text-slate-500">{c.plate}{c.year ? ` · ${c.year}` : ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tariff_per_day",
      header: "Tarif/Hari",
      hideOnMobile: true,
      render: (c) => (
        <span className="font-medium text-slate-700">
          {formatRupiah(Number(c.tariff_per_day))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <button onClick={() => toggleStatus(c)} title="Klik untuk ubah status">
          <Badge tone={c.status === "available" ? "green" : "amber"}>
            {statusMobilLabel[c.status]}
          </Badge>
        </button>
      ),
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
        data={cars}
        rowKey={(c) => c.id}
        searchKeys={["brand", "model", "plate"]}
        searchPlaceholder="Cari merek, model, atau plat..."
        emptyMessage="Belum ada mobil. Klik 'Tambah Mobil' untuk memulai."
        toolbar={
          <Button onClick={openAdd}>+ Tambah Mobil</Button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Mobil" : "Tambah Mobil"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Merek"
              required
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Toyota"
            />
            <Input
              label="Model"
              required
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="Avanza"
            />
            <Input
              label="Plat Nomor"
              required
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="B 1234 XX"
            />
            <Input
              label="Tahun"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="2023"
            />
            <Input
              label="Tarif per Hari (Rp)"
              type="number"
              required
              value={form.tariff_per_day}
              onChange={(e) => setForm({ ...form, tariff_per_day: e.target.value })}
              placeholder="350000"
            />
            <Input
              label="Status"
              readOnly
              value={statusMobilLabel[form.status]}
              hint="Status otomatis dari booking. Bisa di-override manual di tabel."
            />
          </div>
          <Input
            label="URL Foto Mobil (opsional)"
            value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            placeholder="https://..."
            hint="Tempel URL gambar mobil. Kosongkan untuk ikon default."
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
        message="Yakin ingin menghapus mobil ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
