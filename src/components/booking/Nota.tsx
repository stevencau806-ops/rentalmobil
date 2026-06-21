import type { Booking } from "@/lib/types";
import { formatRupiah, formatTanggal, formatTanggalWaktu } from "@/lib/utils";

const DEFAULT_TERMS = [
  "Kendaraan (Mobil) yang disewakan tidak dapat dipindah tangankan kepada pihak lain/ketiga tanpa seizin pemilik kendaraan.",
  "Kendaraan (Mobil) tidak dapat dijadikan jaminan/digadaikan dengan tujuan kepada siapapun.",
  "Pelanggaran no 1 & no 2 akan diproses melalui jalur hukum.",
  "Perubahan rute wajib konfirmasi ke pemilik mobil.",
  "Bersedia mengembalikan kendaraan (Mobil) seperti saat diambil.",
  "Bersedia mengembalikan bahan bakar sesuai balok seperti saat diambil.",
  "Kerusakan, body lecet dan kecelakaan kendaraan (Mobil) dalam masa pinjaman ditanggung penyewa.",
  "Dilarang membawa atau untuk bertransaksi barang haram/narkoba selama masa pinjaman kendaraan (Mobil).",
  "Denda keterlambatan Rp40.000/jam.",
];

const DEFAULT_SIGNATURES = { left: "Penyewa", right: "Pemilik" };

interface NotaProps {
  booking: Booking;
  appName?: string;
  phone?: string | null;
  notaTerms?: string | null;
  notaSignatures?: string | null;
  qrisUrl?: string | null;
}

function parseTerms(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_TERMS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
}

function parseSignatures(raw: string | null | undefined): { left: string; right: string } {
  if (!raw) return DEFAULT_SIGNATURES;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.left === "string") return parsed;
    return DEFAULT_SIGNATURES;
  } catch {
    return DEFAULT_SIGNATURES;
  }
}

/** Print-ready receipt/invoice view. Used inside a modal. */
export function Nota({ booking, appName = "Erlangga Rental Mobil", phone, notaTerms, notaSignatures, qrisUrl }: NotaProps) {
  const subtotal = Number(booking.total_cost);
  const lateFee = Number(booking.late_fee || 0);
  const total = subtotal + lateFee;

  const terms = parseTerms(notaTerms);
  const signatures = parseSignatures(notaSignatures);

  return (
    <div className="bg-white p-6 text-slate-900" id="nota-print-area">
      {/* Header */}
      <div className="flex flex-col items-center border-b-2 border-brand-800 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/ddbq1mlsc/image/upload/q_auto/f_auto/v1781968644/erlangga-logo-sidebar_faalnu.png"
          alt="Erlangga Rental Mobil"
          className="h-24 w-auto object-contain"
        />
        {phone && (
          <p className="mt-2 text-sm text-slate-600">No. Telp: {phone}</p>
        )}
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

      {/* QRIS Pembayaran */}
      {qrisUrl && (
        <div className="mt-5 flex flex-col items-center rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
            Pembayaran via QRIS
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrisUrl}
            alt="QRIS Pembayaran"
            className="h-44 w-auto object-contain"
          />
          <p className="mt-2 text-[10px] text-slate-400">Scan QR di atas untuk pembayaran</p>
        </div>
      )}

      {booking.notes && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Catatan</p>
          <p className="text-slate-600">{booking.notes}</p>
        </div>
      )}

      {/* Ketentuan Sewa */}
      <div className="mt-5 rounded-lg border border-slate-200 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
          Ketentuan Sewa
        </p>
        <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-slate-600">
          {terms.map((term, i) => (
            <li key={i}>{term}</li>
          ))}
        </ol>
      </div>

      {/* Tanda Tangan */}
      <div className="mt-8 flex justify-between px-4">
        <div className="text-center">
          <p className="text-xs font-medium text-slate-700">{signatures.left}</p>
          <div className="mt-16 w-32 border-b border-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-700">{signatures.right}</p>
          <div className="mt-16 w-32 border-b border-slate-400" />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <p>Terima kasih telah menyewa di {appName}.</p>
        <p className="mt-1">Simpan nota ini sebagai bukti transaksi.</p>
      </div>
    </div>
  );
}
