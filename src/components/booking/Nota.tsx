import type { Booking, AdditionalFine } from "@/lib/types";
import { formatRupiah, formatTanggal, formatTanggalWaktu } from "@/lib/utils";

const DEFAULT_TERMS = [
  "Kendaraan yang disewakan tidak dapat dipindah tangankan kepada pihak lain tanpa seizin pemilik.",
  "Kendaraan tidak dapat dijadikan jaminan/digadaikan.",
  "Pelanggaran no 1 & 2 akan diproses melalui jalur hukum.",
  "Perubahan rute wajib konfirmasi ke pemilik mobil.",
  "Bersedia mengembalikan kendaraan seperti saat diambil.",
  "Bersedia mengembalikan BBM sesuai balok seperti saat diambil.",
  "Kerusakan & kecelakaan dalam masa sewa ditanggung penyewa.",
  "Dilarang membawa barang haram/narkoba selama masa sewa.",
  "Denda keterlambatan Rp40.000/jam.",
];

const DEFAULT_SIGNATURES = { left: "Penyewa", right: "Pemilik" };

interface NotaProps {
  booking: Booking;
  appName?: string;
  phone?: string | null;
  notaTerms?: string | null;
  notaSignatures?: string | null;
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

/** Modern compact receipt - fits on 1 A4 page */
export function Nota({ booking, appName = "Erlangga Rental Mobil", phone, notaTerms, notaSignatures }: NotaProps) {
  const subtotal = Number(booking.total_cost);
  const lateFee = Number(booking.late_fee || 0);
  let additionalFinesList: AdditionalFine[] = [];
  if (booking.additional_fines) {
    try {
      additionalFinesList = JSON.parse(booking.additional_fines);
    } catch { /* ignore */ }
  }
  const additionalFinesTotal = additionalFinesList.reduce((s, f) => s + (f.amount || 0), 0);
  const total = subtotal + lateFee + additionalFinesTotal;

  const terms = parseTerms(notaTerms);
  const signatures = parseSignatures(notaSignatures);

  return (
    <div className="bg-white p-4 text-slate-900 text-[13px] leading-snug" id="nota-print-area">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-400 pb-2">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1782311347/u5zbqafgubkyjckrjseq.png"
            alt={appName}
            className="h-12 w-auto object-contain"
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900">{appName}</h1>
            {phone && <p className="text-[11px] text-slate-700">{phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
              booking.payment_status === "paid"
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
          </span>
          <p className="mt-1 text-[11px] text-slate-600">#{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Info Grid - Customer + Car + Dates */}
      <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
        <div className="rounded border border-slate-300 p-2">
          <p className="text-[10px] font-bold uppercase text-slate-600 mb-0.5">Pelanggan</p>
          <p className="font-semibold text-slate-900">{booking.customers?.name ?? "-"}</p>
          <p className="text-slate-700">NIK: {booking.customers?.nik ?? "-"}</p>
          <p className="text-slate-700">HP: {booking.customers?.phone ?? "-"}</p>
        </div>
        <div className="rounded border border-slate-300 p-2">
          <p className="text-[10px] font-bold uppercase text-slate-600 mb-0.5">Kendaraan</p>
          <p className="font-semibold text-slate-900">{booking.cars?.brand} {booking.cars?.model}</p>
          <p className="text-slate-700">Plat: {booking.cars?.plate ?? "-"}</p>
        </div>
        <div className="rounded border border-slate-300 p-2">
          <p className="text-[10px] font-bold uppercase text-slate-600 mb-0.5">Periode Sewa</p>
          <p className="font-semibold text-slate-900">{booking.duration_days} Hari</p>
          <p className="text-slate-700">{formatTanggalWaktu(booking.start_date)}</p>
          <p className="text-slate-700">s/d {formatTanggalWaktu(booking.end_date)}</p>
        </div>
      </div>

      {/* Rincian Biaya - table */}
      <div className="mt-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-700">
              <th className="py-1 text-left font-semibold">Deskripsi</th>
              <th className="py-1 text-center font-semibold">Detail</th>
              <th className="py-1 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-1">Sewa Mobil</td>
              <td className="py-1 text-center text-slate-700">
                {booking.duration_days} × {formatRupiah(booking.cars?.tariff_per_day ?? 0)}
              </td>
              <td className="py-1 text-right font-semibold">{formatRupiah(subtotal)}</td>
            </tr>
            {lateFee > 0 && (
              <tr>
                <td className="py-1 text-red-700 font-medium">Denda Keterlambatan</td>
                <td className="py-1 text-center text-red-600 text-[11px]">
                  {booking.actual_return_date && formatTanggalWaktu(booking.actual_return_date)}
                </td>
                <td className="py-1 text-right font-semibold text-red-700">{formatRupiah(lateFee)}</td>
              </tr>
            )}
            {additionalFinesList.map((fine, i) => (
              <tr key={i}>
                <td className="py-1 text-red-700 font-medium">Denda: {fine.label || fine.type}</td>
                <td className="py-1 text-center text-red-600 text-[11px]">{fine.type}</td>
                <td className="py-1 text-right font-semibold text-red-700">{formatRupiah(fine.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800">
              <td colSpan={2} className="py-1.5 text-right font-bold text-slate-900">TOTAL</td>
              <td className="py-1.5 text-right text-sm font-bold text-slate-900">{formatRupiah(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {booking.notes && (
        <div className="mt-2 rounded bg-slate-50 p-1.5 text-[11px]">
          <span className="font-semibold text-slate-700">Catatan:</span>{" "}
          <span className="text-slate-800">{booking.notes}</span>
        </div>
      )}

      {/* Ketentuan */}
      <div className="mt-2 border border-slate-300 rounded p-2">
        <p className="text-[10px] font-bold uppercase text-slate-700 mb-1">Ketentuan Sewa</p>
        <ol className="list-decimal pl-3 text-[10px] leading-tight text-slate-800 space-y-0">
          {terms.map((term, i) => (
            <li key={i}>{term}</li>
          ))}
        </ol>
      </div>

      {/* Tanda Tangan */}
      <div className="mt-3 flex justify-between px-6">
        <div className="text-center">
          <p className="text-[11px] font-medium text-slate-800">{signatures.left}</p>
          <div className="mt-10 w-24 border-b border-slate-600" />
        </div>
        <div className="text-center">
          <p className="text-[11px] font-medium text-slate-800">{signatures.right}</p>
          <div className="mt-10 w-24 border-b border-slate-600" />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-3 text-center text-[10px] text-slate-600">
        Terima kasih telah menyewa di {appName}. Simpan nota ini sebagai bukti transaksi.
        <br />
        Dicetak: {formatTanggalWaktu(new Date().toISOString())}
      </p>
    </div>
  );
}
