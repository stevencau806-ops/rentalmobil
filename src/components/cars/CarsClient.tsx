"use client";

import { useState, useRef } from "react";
import { Car as CarIcon, Upload, X, Loader2 } from "lucide-react";
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

/** Format number string with thousand separators for display */
function formatNumber(value: string): string {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("id-ID");
}

/** Parse formatted number back to raw digits */
function parseNumber(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

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
  commission_percent: string;
  commission_note: string;
}

const emptyForm: FormState = {
  brand: "",
  model: "",
  plate: "",
  year: "",
  tariff_per_day: "",
  status: "available",
  photo_url: "",
  commission_percent: "0",
  commission_note: "",
};

export function CarsClient({ initialCars }: CarsClientProps) {
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function openAdd() {
    setForm(emptyForm);
    setPreviewUrl(null);
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
      commission_percent: (car.commission_percent ?? 0).toString(),
      commission_note: car.commission_note ?? "",
    });
    setPreviewUrl(car.photo_url ?? null);
    setModalOpen(true);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "mobil");

      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Gagal upload foto", "error");
        setPreviewUrl(null);
        return;
      }

      setForm((prev) => ({ ...prev, photo_url: data.url }));
      setPreviewUrl(data.url);
      toast("Foto berhasil diupload", "success");
    } catch {
      toast("Gagal upload foto", "error");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
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
      commission_percent: Number(form.commission_percent) || 0,
      commission_note: form.commission_note.trim() || null,
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
        <div>
          <span className="font-medium text-slate-700">
            {formatRupiah(Number(c.tariff_per_day))}
          </span>
          {c.commission_percent > 0 && (
            <p className="text-xs text-amber-600">Komisi {c.commission_percent}%</p>
          )}
        </div>
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
              type="text"
              inputMode="numeric"
              required
              value={formatNumber(form.tariff_per_day)}
              onChange={(e) => setForm({ ...form, tariff_per_day: parseNumber(e.target.value) })}
              placeholder="350.000"
            />
            <Input
              label="Status"
              readOnly
              value={statusMobilLabel[form.status]}
              hint="Status otomatis dari booking. Bisa di-override manual di tabel."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Foto Mobil
            </label>
            <div className="flex items-start gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer flex flex-col items-center gap-1 w-28 h-20"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-xs text-slate-500">
                  {uploading ? "Upload..." : "Upload"}
                </span>
              </button>
              {previewUrl && (
                <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    onClick={() => {
                      setPreviewUrl(null);
                      setForm((prev) => ({ ...prev, photo_url: "" }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP. Auto-compress saat upload.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Komisi (%)"
              type="number"
              min="0"
              max="100"
              value={form.commission_percent}
              onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
              placeholder="0"
              hint="0% = milik sendiri. Isi persentase bagi hasil untuk mobil titipan."
            />
            <Input
              label="Keterangan Komisi"
              value={form.commission_note}
              onChange={(e) => setForm({ ...form, commission_note: e.target.value })}
              placeholder="Nama pemilik / catatan"
              hint="Opsional. Misal: Pak Budi, Haji Udin, dll."
            />
          </div>
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
