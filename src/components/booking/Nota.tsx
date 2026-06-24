import type { Booking, AdditionalFine } from "@/lib/types";
import { formatRupiah, formatTanggalWaktu } from "@/lib/utils";

const DEFAULT_TERMS = [
  "Kendaraan tidak dapat dipindah tangankan kepada pihak lain tanpa seizin pemilik.",
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

/** Thermal 80mm receipt style */
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
  const dash = "- - - - - - - - - - - - - - - - - - - -";

  return (
    <div className="bg-white p-4 font-mono text-[11px] leading-relaxed text-black" id="nota-print-area">
      {/* Header */}
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1782311347/u5zbqafgubkyjckrjseq.png"
          alt={appName}
          className="mx-auto h-12 w-auto object-contain"
        />
        <p className="mt-1 font-bold">{appName}</p>
        {phone && <p className="text-[10px]">{phone}</p>}
      </div>

      <p className="mt-2 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Status + ID */}
      <div className="mt-1 text-center">
        <span className="inline-block border border-black px-2 py-0.5 text-[10px] font-bold uppercase">
          {booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
        </span>
        <p className="mt-0.5 text-[9px]">#{booking.id.slice(0, 8).toUpperCase()}</p>
      </div>

      <p className="mt-1 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Pelanggan */}
      <div className="mt-1">
        <p className="text-[9px] font-bold uppercase">PELANGGAN</p>
        <p className="font-bold">{booking.customers?.name ?? "-"}</p>
        <p>NIK: {booking.customers?.nik ?? "-"}</p>
        <p>HP: {booking.customers?.phone ?? "-"}</p>
      </div>

      <p className="mt-1 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Kendaraan */}
      <div className="mt-1">
        <p className="text-[9px] font-bold uppercase">KENDARAAN</p>
        <p className="font-bold">{booking.cars?.brand} {booking.cars?.model}</p>
        <p>Plat: {booking.cars?.plate ?? "-"}</p>
      </div>

      <p className="mt-1 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Periode Sewa */}
      <div className="mt-1">
        <p className="text-[9px] font-bold uppercase">PERIODE SEWA</p>
        <p className="font-bold">{booking.duration_days} Hari</p>
        <p>{formatTanggalWaktu(booking.start_date)}</p>
        <p>s/d {formatTanggalWaktu(booking.end_date)}</p>
      </div>

      <p className="mt-1 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Rincian Biaya */}
      <div className="mt-1">
        <div className="flex justify-between">
          <span>Sewa Mobil</span>
          <span>{booking.duration_days} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span></span>
          <span>{formatRupiah(subtotal)}</span>
        </div>

        {lateFee > 0 && (
          <div className="mt-1">
            <div className="flex justify-between">
              <span>Denda Keterlambatan</span>
              <span>{formatRupiah(lateFee)}</span>
            </div>
            {booking.actual_return_date && (
              <p className="text-[9px]">Dikembalikan: {formatTanggalWaktu(booking.actual_return_date)}</p>
            )}
          </div>
        )}

        {additionalFinesList.map((fine, i) => (
          <div key={i} className="flex justify-between">
            <span>Denda: {fine.label || fine.type}</span>
            <span>{formatRupiah(fine.amount)}</span>
          </div>
        ))}
      </div>

      <p className="mt-1 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Total */}
      <div className="mt-1 flex justify-between font-bold text-[12px]">
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>

      <p className="mt-1 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Ketentuan Sewa */}
      <div className="mt-2">
        <p className="text-[9px] font-bold uppercase">KETENTUAN SEWA</p>
        <ol className="mt-0.5 list-decimal pl-4 text-[9px] leading-snug">
          {terms.map((term, i) => (
            <li key={i}>{term}</li>
          ))}
        </ol>
      </div>

      <p className="mt-2 text-center text-[10px] tracking-widest">{dash}</p>

      {/* Tanda Tangan */}
      <div className="mt-3 flex justify-between px-4">
        <div className="text-center">
          <p className="text-[10px]">{signatures.left}</p>
          <div className="mt-12 w-20 border-b border-black" />
        </div>
        <div className="text-center">
          <p className="text-[10px]">{signatures.right}</p>
          <div className="mt-12 w-20 border-b border-black" />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-3 text-center text-[9px]">
        Terima kasih telah menyewa di {appName}.
        <br />
        Simpan nota ini sebagai bukti transaksi.
        <br />
        Dicetak: {formatTanggalWaktu(new Date().toISOString())}
      </p>
    </div>
  );
}
