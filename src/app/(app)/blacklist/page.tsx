import { getBlacklist, getCustomers } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { BlacklistClient } from "@/components/blacklist/BlacklistClient";

export const dynamic = "force-dynamic";

export default async function BlacklistPage() {
  const [list, customers] = await Promise.all([getBlacklist(), getCustomers()]);
  return (
    <div>
      <PageHeader
        title="Blacklist Pelanggan"
        description="Daftar pelanggan bermasalah. Sistem otomatis memberi peringatan saat NIK terdaftar."
      />
      <BlacklistClient initialList={list} customers={customers} />
    </div>
  );
}
