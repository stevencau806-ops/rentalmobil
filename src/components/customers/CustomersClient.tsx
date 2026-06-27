"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, Upload, Camera, Eye, X, Loader2, Ban, Search, Pencil, Trash2 } from "lucide-react";
import type { Customer } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
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

const CARD_COLORS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-teal-500 to-teal-600",
  "from-indigo-500 to-indigo-600",
  "from-cyan-500 to-cyan-600",
  "from-pink-500 to-pink-600",
];

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
  const [blacklistCustomer, setBlacklistCustomer] = useState<Customer | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistSaving, setBlacklistSaving] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const isBlacklistedNow = blacklistNiks.includes(form.nik.trim());

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nik.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

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
    setDetailCustomer(null);
    setModalOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ktp_upload");
      formData.append("folder", "ktp");
      const res = await fetch("https://api.cloudinary.com/v1_1/dfxc4ceya/image/upload", { method: "POST", body: formData });
      if (!res.ok) { toast("Gagal upload foto KTP", "error"); setPreviewUrl(null); setUploading(false); return; }
      const data = await res.json();
      const url = data.secure_url as string;
      setForm((prev) => ({ ...prev, ktp_url: url }));
      setPreviewUrl(url);
      toast("Foto KTP berhasil diupload", "success");
      await extractKtpData(url);
    } catch { toast("Gagal upload foto KTP", "error"); setPreviewUrl(null); } finally { setUploading(false); }
  }

  async function extractKtpData(cloudinaryUrl: string) {
    setExtracting(true);
    try {
      const res = await fetch("/api/ocr-ktp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: cloudinaryUrl }) });
      if (!res.ok) { toast("Gagal membaca data KTP. Silakan isi manual.", "error"); return; }
      const data = await res.json();
      if (data.nik || data.nama) {
        setForm((prev) => ({ ...prev, nik: data.nik || prev.nik, name: data.nama || prev.name, address: data.alamat || prev.address }));
        toast("Data KTP berhasil dibaca", "success");
      } else { toast("Tidak bisa membaca data KTP. Silakan isi manual.", "error"); }
    } catch { toast("Gagal extract data KTP. Silakan isi manual.", "error"); } finally { setExtracting(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nikClean = form.nik.replace(/\D/g, "");
    if (nikClean.length !== 16) { toast("NIK harus 16 digit angka", "error"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = { name: form.name.trim(), nik: nikClean, phone: form.phone.trim() || null, address: form.address.trim() || null, ktp_url: form.ktp_url.trim() || null };
    let newCustId: string | null = null;
    const { data: insertedData, error } = form.id
      ? await supabase.from("customers").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("customers").insert(payload).select("id").single();
    setSaving(false);
    if (error) { toast(`Gagal: ${error.message}`, "error"); return; }
    if (!form.id && insertedData) newCustId = insertedData.id;
    toast(form.id ? "Pelanggan diperbarui" : "Pelanggan ditambahkan", "success");
    setModalOpen(false);
    await refresh();
    if (!form.id && newCustId) { setNewCustomerId(newCustId); setBookingPrompt(true); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await createClient().from("customers").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) { toast(`Gagal menghapus: ${error.message}`, "error"); return; }
    toast("Pelanggan dihapus", "success");
    setDeleteId(null);
    setDetailCustomer(null);
    await refresh();
  }

  async function refresh() {
    const { data } = await createClient().from("customers").select("*").order("created_at", { ascending: false });
    if (data) setCustomers(data as Customer[]);
  }

  async function handleBlacklist(e: React.FormEvent) {
    e.preventDefault();
    if (!blacklistCustomer || !blacklistReason.trim()) { toast("Alasan blacklist wajib diisi", "error"); return; }
    setBlacklistSaving(true);
    const { error } = await createClient().from("blacklist").insert({ customer_id: blacklistCustomer.id, nik: blacklistCustomer.nik, reason: blacklistReason.trim() });
    setBlacklistSaving(false);
    if (error) { toast(`Gagal: ${error.message}`, "error"); return; }
    toast(`${blacklistCustomer.name} ditambahkan ke blacklist`, "success");
    setBlacklistCustomer(null);
    setBlacklistReason("");
    setDetailCustomer(null);
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase opacity-90">Total Pelanggan</p>
            <p className="mt-1 text-3xl font-bold">{customers.length}</p>
          </div>
          <span className="text-4xl opacity-80">👥</span>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, NIK, atau HP..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <Button onClick={openAdd}>+ Tambah Pelanggan</Button>
      </div>

      {/* Card List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
            <p className="text-2xl mb-2">👥</p>
            <p className="text-sm font-medium text-slate-500">Belum ada pelanggan</p>
          </div>
        ) : (
          filtered.map((c, idx) => {
            const isBlacklisted = blacklistNiks.includes(c.nik);
            const gradient = CARD_COLORS[idx % CARD_COLORS.length];
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white text-sm font-bold shrink-0`}>
                    {c.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                      {isBlacklisted && (
                        <Badge tone="red">
                          <span className="inline-flex items-center gap-0.5 text-[10px]">
                            <TriangleAlert className="h-2.5 w-2.5" /> BL
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{c.nik}</p>
                    {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setDetailCustomer(c)}
                    className={`flex-1 rounded-lg bg-gradient-to-r ${gradient} py-2 text-xs font-semibold text-white hover:opacity-90 active:opacity-80 transition-opacity`}
                  >
                    Lihat Detail
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-400">
        Menampilkan {filtered.length} dari {customers.length} pelanggan
      </p>

      {/* Detail Customer Modal - Colorful */}
      <Modal open={!!detailCustomer} onClose={() => setDetailCustomer(null)} title="Detail Pelanggan" size="md">
        {detailCustomer && (() => {
          const c = detailCustomer;
          const isBlacklisted = blacklistNiks.includes(c.nik);
          return (
            <div className="space-y-3">
              {/* Nama - Purple gradient */}
              <div className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">Nama Pelanggan</p>
                <p className="text-lg font-bold mt-0.5">{c.name}</p>
                {isBlacklisted && (
                  <span className="inline-block mt-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    BLACKLIST
                  </span>
                )}
              </div>

              {/* NIK - Blue gradient */}
              <div className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                <p className="text-[10px] font-bold uppercase opacity-80">NIK (KTP)</p>
                <p className="text-base font-bold font-mono mt-0.5">{c.nik}</p>
              </div>

              {/* HP + Alamat - Teal gradient */}
              <div className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">No. HP</p>
                    <p className="text-sm font-semibold mt-0.5">{c.phone || "-"}</p>
                  </div>
                </div>
                {c.address && (
                  <div className="mt-2 border-t border-white/30 pt-2">
                    <p className="text-[10px] font-bold uppercase opacity-80">Alamat</p>
                    <p className="text-xs mt-0.5 opacity-95">{c.address}</p>
                  </div>
                )}
              </div>

              {/* KTP Photo */}
              {c.ktp_url && (
                <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                  <p className="text-[10px] font-bold uppercase opacity-80">Foto KTP</p>
                  <button
                    onClick={() => { setDetailCustomer(null); setViewKtpUrl(c.ktp_url); }}
                    className="mt-2 w-full rounded-lg bg-white/20 hover:bg-white/30 py-2 text-xs font-semibold transition-colors"
                  >
                    <Eye className="inline h-3.5 w-3.5 mr-1" /> Lihat Foto KTP
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setDetailCustomer(null);
                    router.push(`/booking?customer=${c.id}`);
                  }}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  📋 Booking
                </button>
                {!isBlacklisted ? (
                  <button
                    onClick={() => {
                      setDetailCustomer(null);
                      setBlacklistCustomer(c);
                      setBlacklistReason("");
                    }}
                    className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    🚫 Blacklist
                  </button>
                ) : (
                  <div className="rounded-lg bg-red-100 py-2.5 text-center text-sm font-semibold text-red-600">
                    🚫 Sudah di-Blacklist
                  </div>
                )}
              </div>

              <button
                onClick={() => setDetailCustomer(null)}
                className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Pelanggan" : "Tambah Pelanggan"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* KTP Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Foto KTP</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="relative flex-1 w-full">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                <input id="ktp-camera-input" type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                {uploading || extracting ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50/50">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                      <span className="text-sm text-blue-600">{uploading ? "Mengupload..." : "Membaca data KTP..."}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer flex flex-col items-center gap-1.5" onClick={() => document.getElementById("ktp-camera-input")?.click()}>
                      <Camera className="h-5 w-5 text-blue-500" />
                      <span className="text-xs text-slate-600 font-medium">Foto Langsung</span>
                    </button>
                    <button type="button" className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer flex flex-col items-center gap-1.5" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-5 w-5 text-emerald-500" />
                      <span className="text-xs text-slate-600 font-medium">Pilih File</span>
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1.5 text-center">JPG, PNG, WebP — langsung upload ke cloud</p>
              </div>
              {previewUrl && (
                <div className="relative w-full sm:w-40 h-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                  <img src={previewUrl} alt="Preview KTP" className="w-full h-full object-cover" />
                  <button type="button" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600" onClick={(ev) => { ev.stopPropagation(); setPreviewUrl(null); setForm((prev) => ({ ...prev, ktp_url: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {extracting && <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sedang membaca data dari foto KTP...</p>}
          </div>
          <Input label="Nama Pelanggan" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Budi Santoso" />
          <Input label="NIK (KTP)" required value={form.nik} onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 16); setForm({ ...form, nik: val }); setNikWarned(false); }} onBlur={() => setNikWarned(true)} placeholder="3201234567890001" inputMode="numeric" maxLength={16} hint={`${form.nik.replace(/\D/g, "").length}/16 digit`} error={nikWarned && isBlacklistedNow ? "NIK ini terdaftar di BLACKLIST." : nikWarned && form.nik.length > 0 && form.nik.length < 16 ? "NIK harus 16 digit" : undefined} />
          <Input label="Nomor HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812xxxxxxx" />
          <Textarea label="Alamat" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving || uploading || extracting}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      {/* View KTP Modal */}
      <Modal open={!!viewKtpUrl} onClose={() => setViewKtpUrl(null)} title="Foto KTP" size="lg">
        {viewKtpUrl && (
          <div className="flex flex-col items-center gap-3">
            <img src={viewKtpUrl} alt="Foto KTP" className="w-full max-h-[70vh] object-contain rounded-lg border border-slate-200" />
            <a href={viewKtpUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Buka di tab baru</a>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} message="Yakin ingin menghapus pelanggan ini?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} loading={deleting} />

      {/* Booking Prompt */}
      <Modal open={bookingPrompt} onClose={() => setBookingPrompt(false)} title="Pelanggan Tersimpan" size="sm">
        <div className="text-center space-y-4 py-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"><span className="text-2xl">✅</span></div>
          <p className="text-sm text-slate-600">Pelanggan berhasil ditambahkan. Mau langsung buat booking?</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setBookingPrompt(false)}>Nanti</Button>
            <Button className="flex-1 bg-brand-700 text-white hover:bg-brand-800" onClick={() => { setBookingPrompt(false); router.push(`/booking?customer=${newCustomerId}`); }}>Langsung Booking</Button>
          </div>
        </div>
      </Modal>

      {/* Blacklist Modal */}
      <Modal open={!!blacklistCustomer} onClose={() => setBlacklistCustomer(null)} title="Blokir / Blacklist Pelanggan" size="md">
        {blacklistCustomer && (
          <form onSubmit={handleBlacklist} className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white">
              <p className="text-[10px] font-bold uppercase opacity-80">Pelanggan yang akan diblokir</p>
              <p className="text-lg font-bold mt-0.5">{blacklistCustomer.name}</p>
              <p className="text-xs opacity-90">NIK: {blacklistCustomer.nik}</p>
              {blacklistCustomer.phone && <p className="text-xs opacity-90">HP: {blacklistCustomer.phone}</p>}
            </div>
            <Textarea label="Alasan Blacklist" required rows={3} value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Contoh: Tidak mengembalikan mobil, merusak kendaraan, dll." />
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <TriangleAlert className="mt-px h-4 w-4 shrink-0" />
              <span>Pelanggan yang diblokir akan mendapat peringatan di semua halaman booking.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBlacklistCustomer(null)}>Batal</Button>
              <Button type="submit" variant="danger" disabled={blacklistSaving}>{blacklistSaving ? "Memproses..." : "Konfirmasi Blacklist"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
