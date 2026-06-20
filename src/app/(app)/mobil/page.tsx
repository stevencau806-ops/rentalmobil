import { getCars } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { CarsClient } from "@/components/cars/CarsClient";

export const dynamic = "force-dynamic";

export default async function MobilPage() {
  const cars = await getCars();
  return (
    <div>
      <PageHeader
        title="Data Mobil"
        description="Kelola armada kendaraan, tarif sewa, dan status ketersediaan."
      />
      <CarsClient initialCars={cars} />
    </div>
  );
}
