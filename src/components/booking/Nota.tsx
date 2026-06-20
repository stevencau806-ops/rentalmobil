import type { Booking } from "@/lib/types";
import { formatRupiah, formatTanggal, formatTanggalWaktu } from "@/lib/utils";
import { Logo } from "@/components/Logo";

interface NotaProps {
  booking: Booking;
  appName?: string;
}

/** Print-ready receipt/invoice view. Used inside a modal. */
export function Nota({ booking, appName = "Erlangga Rental Mobil" }: NotaProps) {
  const subtotal = Number(booking.total_cost);
  const lateFee = Number(booking.late_fee || 0);
  const total = subtotal + lateFee;

  return (
    <div className="bg-white p-6 text-slate-900" id="nota-print-area">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-brand-800 pb-4">
        <Logo size={44} />
        <div className="text-right text-xs text-slate-500">
          <p className="font-semibold text-slate-800">{appName}</p>
          <p>www.erlangga-rental.id</p>
          <p>0812-0000-0000</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wide text-brand-900">
          Nota Sewa Mobil
        </h2>
        <span
          className={`rounded px-2 py-1 text-xs font-bold ${
            booking.payment_status === "paid"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
        </span>
      </div>

      {/* Booking info */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase text-slate-400">No. Booking</p>
          <p className="font-mono font-semibold">#{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">Tanggal Cetak</p>
          <p>{formatTanggalWaktu(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Customer & car */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Pelanggan</p>
          <p className="font-semibold text-slate-900">{booking.customers?.name ?? "-"}</p>
          <p className="text-xs text-slate-500">NIK: {booking.customers?.nik ?? "-"}</p>
          <p className="text-xs text-slate-500">HP: {booking.customers?.phone ?? "-"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Kendaraan</p>
          <p className="font-semibold text-slate-900">
            {booking.cars?.brand} {booking.cars?.model}
          </p>
          <p className="text-xs text-slate-500">Plat: {booking.cars?.plate ?? "-"}</p>
        </div>
      </div>

      {/* Rental detail */}
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="py-2">Deskripsi</th>
            <th className="py-2 text-center">Detail</th>
            <th className="py-2 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-2">
              Sewa Mobil
              <div className="text-xs text-slate-500">
                {formatTanggal(booking.start_date)} → {formatTanggal(booking.end_date)}
              </div>
            </td>
            <td className="py-2 text-center">
              {booking.duration_days} hari × {formatRupiah(booking.cars?.tariff_per_day ?? 0)}
            </td>
            <td className="py-2 text-right font-medium">{formatRupiah(subtotal)}</td>
          </tr>
          {lateFee > 0 && (
            <tr>
              <td className="py-2">
                Denda Keterlambatan
                {booking.actual_return_date && (
                  <div className="text-xs text-slate-500">
                    Dikembalikan: {formatTanggalWaktu(booking.actual_return_date)}
                  </div>
                )}
              </td>
              <td className="py-2 text-center text-red-600">Terlambat</td>
              <td className="py-2 text-right font-medium text-red-600">
                {formatRupiah(lateFee)}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300">
            <td colSpan={2} className="py-3 text-right font-bold uppercase text-slate-700">
              Total
            </td>
            <td className="py-3 text-right text-lg font-bold text-brand-900">
              {formatRupiah(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {booking.notes && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Catatan</p>
          <p className="text-slate-600">{booking.notes}</p>
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <p>Terima kasih telah menyewa di {appName}.</p>
        <p className="mt-1">Simpan nota ini sebagai bukti transaksi.</p>
      </div>
    </div>
  );
}
