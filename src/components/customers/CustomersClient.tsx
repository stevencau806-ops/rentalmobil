"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, Upload, Camera, Eye, X, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewKtpUrl, setViewKtpUrl] = useState<string | null>(null);
  const [bookingPrompt, setBookingPrompt] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const isBlacklistedNow = blacklistNiks.includes(form.nik.trim());

  function openAdd() {
    setForm(emptyForm);
    setNikWarned(false);
    setPreviewUrl(null);
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
    setPreviewUrl(c.ktp_url ?? null);
    setModalOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Upload directly to Cloudinary from browser (bypass Vercel - no size limit)
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ktp_upload");
      formData.append("folder", "ktp");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dfxc4ceya/image/upload",
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        toast("Gagal upload foto KTP", "error");
        setPreviewUrl(null);
        setUploading(false);
        return;
      }

      const data = await res.json();
      const url = data.secure_url as string;

      setForm((prev) => ({ ...prev, ktp_url: url }));
      setPreviewUrl(url);
      toast("Foto KTP berhasil diupload", "success");

      // Auto-extract KTP data using Cloudinary URL
      await extractKtpData(url);
    } catch {
      toast("Gagal upload foto KTP", "error");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  async function extractKtpData(cloudinaryUrl: string) {
    setExtracting(true);
    try {
      const res = await fetch("/api/ocr-ktp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cloudinaryUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("OCR error:", errData);
        toast("Gagal membaca data KTP. Silakan isi manual.", "error");
        return;
      }

      const data = await res.json();

      if (data.nik || data.nama) {
        setForm((prev) => ({
          ...prev,
          nik: data.nik || prev.nik,
          name: data.nama || prev.name,
          address: data.alamat || prev.address,
        }));
        toast("Data KTP berhasil dibaca", "success");
      } else {
        toast("Tidak bisa membaca data KTP. Silakan isi manual.", "error");
      }
    } catch {
      toast("Gagal extract data KTP. Silakan isi manual.", "error");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate NIK must be exactly 16 digits
    const nikClean = form.nik.replace(/\D/g, "");
    if (nikClean.length !== 16) {
      toast("NIK harus 16 digit angka", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      nik: nikClean,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      ktp_url: form.ktp_url.trim() || null,
    };

    let newCustomerId: string | null = null;
    const { data: insertedData, error } = form.id
      ? await supabase.from("customers").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("customers").insert(payload).select("id").single();

    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }

    if (!form.id && insertedData) {
      newCustomerId = insertedData.id;
    }

    toast(form.id ? "Pelanggan diperbarui" : "Pelanggan ditambahkan", "success");
    setModalOpen(false);
    await refresh();

    // Show booking prompt only for new customers
    if (!form.id && newCustomerId) {
      setNewCustomerId(newCustomerId);
      setBookingPrompt(true);
    }
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
              <Badge tone="red" title="NIK ini berada di blacklist">
                <span className="inline-flex items-center gap-1">
                  <TriangleAlert className="h-3 w-3" />
                  Blacklist
                </span>
              </Badge>
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
      key: "ktp",
      header: "KTP",
      hideOnMobile: true,
      render: (c) =>
        c.ktp_url ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-blue-600 hover:bg-blue-50"
            onClick={() => setViewKtpUrl(c.ktp_url)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Lihat
          </Button>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
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
        data={customers}
        rowKey={(c) => c.id}
        searchKeys={["name", "nik", "phone"]}
        searchPlaceholder="Cari nama, NIK, atau HP..."
        emptyMessage="Belum ada pelanggan."
        toolbar={<Button onClick={openAdd}>+ Tambah Pelanggan</Button>}
      />

      {/* Form Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Pelanggan" : "Tambah Pelanggan"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* KTP Upload Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Foto KTP
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {/* Upload Area */}
              <div className="relative flex-1 w-full">
                {/* File input for gallery/file picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {/* Camera input - forces camera on mobile */}
                <input
                  id="ktp-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {uploading || extracting ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50/50">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                      <span className="text-sm text-blue-600">
                        {uploading ? "Mengupload..." : "Membaca data KTP..."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer flex flex-col items-center gap-1.5"
                      onClick={() => document.getElementById("ktp-camera-input")?.click()}
                    >
                      <Camera className="h-5 w-5 text-blue-500" />
                      <span className="text-xs text-slate-600 font-medium">Foto Langsung</span>
                    </button>
                    <button
                      type="button"
                      className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer flex flex-col items-center gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-emerald-500" />
                      <span className="text-xs text-slate-600 font-medium">Pilih File</span>
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1.5 text-center">
                  JPG, PNG, WebP — langsung upload ke cloud
                </p>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="relative w-full sm:w-40 h-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Preview KTP"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(null);
                      setForm((prev) => ({ ...prev, ktp_url: "" }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {extracting && (
              <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sedang membaca data dari foto KTP...
              </p>
            )}
          </div>

          <Input
            label="Nama Pelanggan"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Budi Santoso"
          />
          <Input
            label="NIK (KTP)"
            required
            value={form.nik}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 16);
              setForm({ ...form, nik: val });
              setNikWarned(false);
            }}
            onBlur={() => setNikWarned(true)}
            placeholder="3201234567890001"
            inputMode="numeric"
            maxLength={16}
            hint={`${form.nik.replace(/\D/g, "").length}/16 digit`}
            error={
              nikWarned && isBlacklistedNow
                ? "NIK ini terdaftar di BLACKLIST. Pelanggan bermasalah — lanjutkan dengan hati-hati."
                : nikWarned && form.nik.length > 0 && form.nik.length < 16
                ? "NIK harus 16 digit"
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
            <Button type="submit" disabled={saving || uploading || extracting}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View KTP Modal */}
      <Modal
        open={!!viewKtpUrl}
        onClose={() => setViewKtpUrl(null)}
        title="Foto KTP"
        size="lg"
      >
        {viewKtpUrl && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={viewKtpUrl}
              alt="Foto KTP"
              className="w-full max-h-[70vh] object-contain rounded-lg border border-slate-200"
            />
            <a
              href={viewKtpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Buka di tab baru
            </a>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Yakin ingin menghapus pelanggan ini?"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />

      {/* Booking Prompt after saving new customer */}
      <Modal open={bookingPrompt} onClose={() => setBookingPrompt(false)} title="Pelanggan Tersimpan" size="sm">
        <div className="text-center space-y-4 py-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-sm text-slate-600">Pelanggan berhasil ditambahkan. Mau langsung buat booking?</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setBookingPrompt(false)}>
              Nanti
            </Button>
            <Button className="flex-1 bg-brand-700 text-white hover:bg-brand-800" onClick={() => {
              setBookingPrompt(false);
              router.push(`/booking?customer=${newCustomerId}`);
            }}>
              Langsung Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
