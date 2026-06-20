"use client";

import { useState } from "react";
import { Settings as SettingsIcon, UserCircle, Lightbulb } from "lucide-react";
import type { Settings } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";

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

export function SettingsClient({ settings, admins, currentUserId }: SettingsClientProps) {
  const [appName, setAppName] = useState(settings?.app_name ?? "Erlangga Rental Mobil");
  const [finePerHour, setFinePerHour] = useState(settings?.fine_per_hour?.toString() ?? "25000");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = {
      app_name: appName.trim(),
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
