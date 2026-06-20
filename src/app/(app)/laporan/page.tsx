import { getBookings, getExpenses } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const [bookings, expenses] = await Promise.all([getBookings(), getExpenses()]);
  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Analisis pendapatan, pengeluaran, dan riwayat rental. Semua dapat dicetak/diekspor ke PDF."
      />
      <ReportsClient bookings={bookings} expenses={expenses} />
    </div>
  );
}
