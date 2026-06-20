import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const supabase = await createClient();
  const [
    settings,
    { data: adminsData },
    {
      data: { user },
    },
  ] = await Promise.all([
    getSettings(),
    supabase.from("admins").select("id, email, full_name").order("created_at"),
    supabase.auth.getUser(),
  ]);

  const admins = (adminsData ?? []) as {
    id: string;
    email: string;
    full_name: string | null;
  }[];

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Atur tarif denda default, nama aplikasi, dan kelola akun admin."
      />
      <SettingsClient
        settings={settings}
        admins={admins}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
