import { getExpenses, getCars } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExpensesClient } from "@/components/expenses/ExpensesClient";

export const dynamic = "force-dynamic";

export default async function PengeluaranPage() {
  const [expenses, cars] = await Promise.all([getExpenses(), getCars()]);
  return (
    <div>
      <PageHeader
        title="Pengeluaran Operasional"
        description="Catat pengeluaran servis, pajak, ganti oli, dan lainnya untuk perhitungan laba bersih."
      />
      <ExpensesClient initialExpenses={expenses} cars={cars} />
    </div>
  );
}
