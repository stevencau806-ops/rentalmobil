import { getCustomers, getBlacklist } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomersClient } from "@/components/customers/CustomersClient";

export const dynamic = "force-dynamic";

export default async function PelangganPage() {
  const [customers, blacklist] = await Promise.all([
    getCustomers(),
    getBlacklist(),
  ]);
  const blacklistNiks = blacklist.map((b) => b.nik);

  return (
    <div>
      <PageHeader
        title="Data Pelanggan"
        description="Kelola data pelanggan. Sistem otomatis memperingatkan jika NIK terdaftar blacklist."
      />
      <CustomersClient initialCustomers={customers} blacklistNiks={blacklistNiks} />
    </div>
  );
}
