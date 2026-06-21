"use client";

import { useState } from "react";
import { Settings as SettingsIcon, UserCircle, Lightbulb, FileText, PenLine, Plus, Trash2, GripVertical, QrCode } from "lucide-react";
import type { Settings } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";

const DEFAULT_TERMS = [
  "Kendaraan (Mobil) yang disewakan tidak dapat dipindah tangankan kepada pihak lain/ketiga tanpa seizin pemilik kendaraan.",
  "Kendaraan (Mobil) tidak dapat dijadikan jaminan/digadaikan dengan tujuan kepada siapapun.",
  "Pelanggaran no 1 & no 2 akan diproses melalui jalur hukum.",
  "Perubahan rute wajib konfirmasi ke pemilik mobil.",
  "Bersedia mengembalikan kendaraan (Mobil) seperti saat diambil.",
  "Bersedia mengembalikan bahan bakar sesuai balok seperti saat diambil.",
  "Kerusakan, body lecet dan kecelakaan kendaraan (Mobil) dalam masa pinjaman ditanggung penyewa.",
  "Dilarang membawa atau untuk bertransaksi barang haram/narkoba selama masa pinjaman kendaraan (Mobil).",
  "Denda keterlambatan Rp40.000/jam.",
];

const DEFAULT_SIGNATURES = { left: "Penyewa", right: "Pemilik" };

interface AdminInfo {
  id: string;
  email: string;
  full_name: string | null;
}

interface SettingsClientProps {
  settings: Settings | null;
  admins: AdminInfo[];
  currentUserId: string;
}

function parseTerms(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_TERMS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
}

function parseSignatures(raw: string | null | undefined): { left: string; right: string } {
  if (!raw) return DEFAULT_SIGNATURES;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.left === "string") return parsed;
    return DEFAULT_SIGNATURES;
  } catch {
    return DEFAULT_SIGNATURES;
  }
}

export function SettingsClient({ settings, admins, currentUserId }: SettingsClientProps) {
  const [appName, setAppName] = useState(settings?.app_name ?? "Erlangga Rental Mobil");
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [finePerHour, setFinePerHour] = useState(settings?.fine_per_hour?.toString() ?? "25000");
  const [saving, setSaving] = useState(false);

  // Nota terms
  const [terms, setTerms] = useState<string[]>(parseTerms(settings?.nota_terms));
  const [savingTerms, setSavingTerms] = useState(false);

  // Nota signatures
  const [signatures, setSignatures] = useState(parseSignatures(settings?.nota_signatures));
  const [savingSignatures, setSavingSignatures] = useState(false);

  // QRIS
  const [qrisUrl, setQrisUrl] = useState(settings?.qris_url ?? "");
  const [savingQris, setSavingQris] = useState(false);

  const toast = useToast();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      app_name: appName.trim(),
      phone: phone.trim() || null,
      fine_per_hour: Number(finePerHour) || 0,
    };

    let error;
    if (settings?.id) {
      ({ error } = await supabase.from("settings").update(payload).eq("id", settings.id));
    } else {
      ({ error } = await supabase.from("settings").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("Pengaturan disimpan", "success");
  }

  async function handleSaveTerms(e: React.FormEvent) {
    e.preventDefault();
    const filtered = terms.filter((t) => t.trim() !== "");
    if (filtered.length === 0) {
      toast("Minimal 1 pasal harus diisi", "error");
      return;
    }
    setSavingTerms(true);
    const supabase = createClient();
    const payload = { nota_terms: JSON.stringify(filtered) };

    let error;
    if (settings?.id) {
      ({ error } = await supabase.from("settings").update(payload).eq("id", settings.id));
    } else {
      ({ error } = await supabase.from("settings").insert({ ...payload, app_name: appName, fine_per_hour: Number(finePerHour) || 0 }));
    }

    setSavingTerms(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    setTerms(filtered);
    toast("Pasal nota disimpan", "success");
  }

  async function handleSaveSignatures(e: React.FormEvent) {
    e.preventDefault();
    if (!signatures.left.trim() || !signatures.right.trim()) {
      toast("Nama pihak TTD tidak boleh kosong", "error");
      return;
    }
    setSavingSignatures(true);
    const supabase = createClient();
    const payload = { nota_signatures: JSON.stringify(signatures) };

    let error;
    if (settings?.id) {
      ({ error } = await supabase.from("settings").update(payload).eq("id", settings.id));
    } else {
      ({ error } = await supabase.from("settings").insert({ ...payload, app_name: appName, fine_per_hour: Number(finePerHour) || 0 }));
    }

    setSavingSignatures(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("TTD nota disimpan", "success");
  }

  async function handleSaveQris(e: React.FormEvent) {
    e.preventDefault();
    setSavingQris(true);
    const supabase = createClient();
    const payload = { qris_url: qrisUrl.trim() || null };

    let error;
    if (settings?.id) {
      ({ error } = await supabase.from("settings").update(payload).eq("id", settings.id));
    } else {
      ({ error } = await supabase.from("settings").insert({ ...payload, app_name: appName, fine_per_hour: Number(finePerHour) || 0 }));
    }

    setSavingQris(false);
    if (error) {
      toast(`Gagal: ${error.message}`, "error");
      return;
    }
    toast("QRIS disimpan", "success");
  }

  function updateTerm(index: number, value: string) {
    const updated = [...terms];
    updated[index] = value;
    setTerms(updated);
  }

  function removeTerm(index: number) {
    setTerms(terms.filter((_, i) => i !== index));
  }

  function addTerm() {
    setTerms([...terms, ""]);
  }

  return (
    <div className="space-y-6">
      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-brand-600" />
              Pengaturan Umum
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nama Aplikasi"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Erlangga Rental Mobil"
            />
            <Input
              label="No. Telepon (untuk Nota)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812-0000-0000"
            />
            <Input
              label="Denda per Jam Keterlambatan (Rp)"
              type="number"
              value={finePerHour}
              onChange={(e) => setFinePerHour(e.target.value)}
              hint={`Saat ini: ${formatRupiah(Number(finePerHour) || 0)} per jam terlambat`}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Nota Terms / Pasal */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              Pasal / Ketentuan Nota
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveTerms} className="space-y-3">
            <p className="text-xs text-slate-500">
              Edit pasal-pasal yang tampil di nota sewa. Urutannya sesuai nomor.
            </p>
            {terms.map((term, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <Textarea
                  rows={2}
                  value={term}
                  onChange={(e) => updateTerm(i, e.target.value)}
                  placeholder={`Pasal ${i + 1}...`}
                  className="flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeTerm(i)}
                  className="mt-2 rounded p-1.5 text-red-500 hover:bg-red-50"
                  title="Hapus pasal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTerm}>
              <span className="inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                Tambah Pasal
              </span>
            </Button>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingTerms}>
                {savingTerms ? "Menyimpan..." : "Simpan Pasal"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Nota Signatures / TTD */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <PenLine className="h-4 w-4 text-brand-600" />
              Tanda Tangan Nota
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveSignatures} className="space-y-4">
            <p className="text-xs text-slate-500">
              Nama pihak yang tanda tangan di nota (kiri = penyewa, kanan = pemilik/rental).
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Pihak Kiri (Penyewa)"
                value={signatures.left}
                onChange={(e) => setSignatures({ ...signatures, left: e.target.value })}
                placeholder="Penyewa"
              />
              <Input
                label="Pihak Kanan (Pemilik)"
                value={signatures.right}
                onChange={(e) => setSignatures({ ...signatures, right: e.target.value })}
                placeholder="Pemilik"
              />
            </div>
            {/* Preview */}
            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <p className="mb-3 text-center text-[10px] font-semibold uppercase text-slate-400">Preview TTD</p>
              <div className="flex justify-between px-8">
                <div className="text-center">
                  <div className="mb-10 text-xs text-slate-500">{signatures.left || "Penyewa"}</div>
                  <div className="border-b border-slate-400 w-28" />
                </div>
                <div className="text-center">
                  <div className="mb-10 text-xs text-slate-500">{signatures.right || "Pemilik"}</div>
                  <div className="border-b border-slate-400 w-28" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingSignatures}>
                {savingSignatures ? "Menyimpan..." : "Simpan TTD"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* QRIS */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <QrCode className="h-4 w-4 text-brand-600" />
              QRIS Pembayaran
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveQris} className="space-y-4">
            <p className="text-xs text-slate-500">
              Masukkan URL gambar QRIS. Gambar akan ditampilkan di Nota agar pelanggan bisa scan untuk bayar.
            </p>
            <Input
              label="URL Gambar QRIS"
              value={qrisUrl}
              onChange={(e) => setQrisUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/... atau URL gambar QRIS lainnya"
            />
            {qrisUrl.trim() && (
              <div className="rounded-lg border border-dashed border-slate-300 p-4">
                <p className="mb-2 text-center text-[10px] font-semibold uppercase text-slate-400">Preview QRIS</p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisUrl.trim()}
                    alt="QRIS Preview"
                    className="h-48 w-auto rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={savingQris}>
                {savingQris ? "Menyimpan..." : "Simpan QRIS"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Admin users */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-brand-600" />
              Akun Admin ({admins.length}/3)
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <ul className="divide-y divide-slate-100">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {(admin.full_name ?? admin.email)[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">
                      {admin.full_name ?? admin.email}
                      {admin.id === currentUserId && (
                        <Badge tone="blue" className="ml-2">Anda</Badge>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </div>
                </div>
                <Badge tone="gray">Admin</Badge>
              </li>
            ))}
            {admins.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">
                Belum ada akun admin terdaftar di database.
              </li>
            )}
          </ul>
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                Untuk menambah/menghapus admin, kelola langsung di{" "}
                <span className="font-medium">Supabase Dashboard → Authentication → Users</span>.
                Maksimal 3 akun sesuai paket.
              </span>
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Session */}
      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Sesi Login</p>
            <p className="text-sm text-slate-500">Keluar dari akun Anda di perangkat ini.</p>
          </div>
          <LogoutButton />
        </CardBody>
      </Card>

      {/* About */}
      <Card className="bg-slate-50">
        <CardBody>
          <p className="text-xs text-slate-500">
            <strong>Erlangga Rental Mobil</strong> v1.0.0 · Dibuat oleh{" "}
            <strong>OOS SHOP</strong>. Ditenagai Next.js & Supabase.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
