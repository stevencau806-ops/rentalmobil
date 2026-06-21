import { getBookings, getCars, getCustomers, getBlacklist, getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookingClient } from "@/components/booking/BookingClient";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [bookings, cars, customers, blacklist, settings] = await Promise.all([
    getBookings(),
    getCars(),
    getCustomers(),
    getBlacklist(),
    getSettings(),
  ]);

  const finePerHour = settings?.fine_per_hour ?? 25000;

  return (
    <div>
      <PageHeader
        title="Booking Rental"
        description="Buat booking, selesaikan sewa dengan denda otomatis, kelola pembayaran, dan cetak nota."
      />
      <BookingClient
        initialBookings={bookings}
        cars={cars}
        customers={customers}
        finePerHour={finePerHour}
        phone={settings?.phone ?? null}
        blacklistNiks={blacklist.map((b) => b.nik)}
        notaTerms={settings?.nota_terms ?? null}
        notaSignatures={settings?.nota_signatures ?? null}
        qrisUrl={settings?.qris_url ?? null}
        fineTypes={settings?.fine_types ?? null}
      />
    </div>
  );
}
