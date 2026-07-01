import { getBookings, getExpenses, getCars } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const [bookings, expenses, cars] = await Promise.all([getBookings(), getExpenses(), getCars()]);
  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Analisis pendapatan, pengeluaran, komisi, dan riwayat rental."
      />
      <ReportsClient bookings={bookings} expenses={expenses} cars={cars} />
    </div>
  );
}
