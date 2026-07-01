import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function QrisPage() {
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="QRIS Pembayaran"
        description="Tunjukkan QR code ini ke pelanggan untuk pembayaran."
      />

      {settings?.qris_url ? (
        <Card className="mx-auto max-w-md">
          <CardBody className="flex flex-col items-center py-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.qris_url}
              alt="QRIS Pembayaran"
              className="w-full max-w-xs rounded-lg object-contain"
            />
            <p className="mt-4 text-center text-sm text-slate-500">
              Scan QR di atas untuk pembayaran
            </p>
            <p className="mt-1 text-center text-xs text-slate-400">
              {settings.app_name ?? "Erlangga Rental Mobil"}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-3xl">📱</p>
            <p className="mt-3 text-sm font-medium text-slate-700">QRIS belum diatur</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload gambar QRIS di halaman Pengaturan terlebih dahulu.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
