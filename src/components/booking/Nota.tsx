import type { Booking, AdditionalFine } from "@/lib/types";
import { formatRupiah, formatTanggalWaktu } from "@/lib/utils";

const DEFAULT_TERMS = [
  "Kendaraan tidak dapat dipindah tangankan tanpa seizin pemilik.",
  "Kendaraan tidak dapat dijadikan jaminan/digadaikan.",
  "Pelanggaran no 1 & 2 diproses melalui jalur hukum.",
  "Perubahan rute wajib konfirmasi ke pemilik mobil.",
  "Bersedia mengembalikan kendaraan seperti saat diambil.",
  "Bersedia mengembalikan BBM sesuai balok saat diambil.",
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

/** Thermal 80mm receipt - optimized for EPPOS thermal printer */
export function Nota({ booking, appName = "Erlangga Rental Mobil", phone, notaTerms, notaSignatures }: NotaProps) {
  const subtotal = Number(booking.total_cost);
  const lateFee = Number(booking.late_fee || 0);
  let additionalFinesList: AdditionalFine[] = [];
  if (booking.additional_fines) {
    try { additionalFinesList = JSON.parse(booking.additional_fines); } catch { /* */ }
  }
  const additionalFinesTotal = additionalFinesList.reduce((s, f) => s + (f.amount || 0), 0);
  const total = subtotal + lateFee + additionalFinesTotal;
  const terms = parseTerms(notaTerms);
  const signatures = parseSignatures(notaSignatures);

  // Parse extension info from notes: [EXT:originalEndDate|extDays]
  let originalEndDate: string | null = null;
  let extendedDays = 0;
  let cleanNotes = booking.notes || "";
  const extMatch = cleanNotes.match(/\[EXT:([^|]+)\|(\d+)\]/);
  if (extMatch) {
    originalEndDate = extMatch[1];
    extendedDays = Number(extMatch[2]);
    cleanNotes = cleanNotes.replace(/\[EXT:[^\]]+\]/, "").trim();
  }
  const originalDays = booking.duration_days - extendedDays;

  return (
    <div className="nota-receipt bg-white px-2 py-2 font-mono text-[12px] leading-normal text-black" id="nota-print-area">
      {/* Header */}
      <div className="nota-section text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1782311347/u5zbqafgubkyjckrjseq.png" alt={appName} className="mx-auto h-14 w-auto" />
        <p className="font-semibold text-[11px]">{appName}</p>
        {phone && <p className="text-[10px]">{phone}</p>}
      </div>
      <div className="nota-divider" />

      {/* Status */}
      <div className="nota-section text-center">
        <span className="border border-black px-1.5 py-0.5 text-[10px] font-semibold">
          {booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
        </span>
        <span className="ml-2 text-[9px]">#{booking.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <div className="nota-divider" />

      {/* Pelanggan */}
      <div className="nota-section">
        <p className="text-[9px] font-semibold">PELANGGAN</p>
        <p className="font-semibold">{booking.customers?.name ?? "-"}</p>
        <p>NIK: {booking.customers?.nik ?? "-"} | HP: {booking.customers?.phone ?? "-"}</p>
      </div>

      {/* Kendaraan */}
      <div className="nota-section">
        <p className="text-[9px] font-semibold">KENDARAAN</p>
        <p>{booking.cars?.brand} {booking.cars?.model} | Plat: {booking.cars?.plate ?? "-"}</p>
      </div>

      {/* Periode */}
      <div className="nota-section">
        <p className="text-[9px] font-semibold">PERIODE SEWA: {originalDays} Hari</p>
        <p>{formatTanggalWaktu(booking.start_date)} s/d {originalEndDate ? formatTanggalWaktu(originalEndDate) : formatTanggalWaktu(booking.end_date)}</p>
        {extendedDays > 0 && (
          <>
            <p className="mt-1 text-[9px] font-semibold">PERPANJANGAN: +{extendedDays} Hari</p>
            <p>{originalEndDate ? formatTanggalWaktu(originalEndDate) : ""} s/d {formatTanggalWaktu(booking.end_date)}</p>
            <p className="text-[9px] mt-0.5">Total: {booking.duration_days} Hari</p>
          </>
        )}
        {booking.actual_return_date && (
          <p className="mt-0.5">Dikembalikan: {formatTanggalWaktu(booking.actual_return_date)}</p>
        )}
      </div>

      {/* Catatan */}
      {cleanNotes && (
        <div className="nota-section">
          <p className="text-[9px] font-semibold">CATATAN</p>
          <p>{cleanNotes}</p>
        </div>
      )}

      <div className="nota-divider" />

      {/* Biaya */}
      <div className="nota-section">
        {extendedDays > 0 ? (
          <>
            <div className="flex justify-between">
              <span>Sewa Awal</span>
              <span>{originalDays} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Perpanjangan</span>
              <span>{extendedDays} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>Sewa Mobil</span>
            <span>{booking.duration_days} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
          </div>
        )}
        {lateFee > 0 && (
          <div className="flex justify-between">
            <span>Denda Keterlambatan</span>
            <span>{formatRupiah(lateFee)}</span>
          </div>
        )}
        {additionalFinesList.map((fine, i) => (
          <div key={i} className="flex justify-between">
            <span>Denda: {fine.label || fine.type}</span>
            <span>{formatRupiah(fine.amount)}</span>
          </div>
        ))}
      </div>
      <div className="nota-section flex justify-between font-semibold text-[12px]">
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>
      <div className="nota-divider" />

      {/* Ketentuan */}
      <div className="nota-section">
        <p className="text-[9px] font-semibold">KETENTUAN SEWA</p>
        <ol className="nota-terms list-decimal pl-3 text-[9px]">
          {terms.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      </div>
      <div className="nota-divider" />

      {/* TTD */}
      <div className="nota-section flex justify-between px-2">
        <div className="text-center">
          <p className="text-[10px]">{signatures.left}</p>
          <div className="mt-8 w-16 border-b border-black" />
        </div>
        <div className="text-center">
          <p className="text-[10px]">{signatures.right}</p>
          <div className="mt-8 w-16 border-b border-black" />
        </div>
      </div>

      {/* Footer */}
      <div className="nota-section text-center text-[9px]">
        <p>Terima kasih - {appName}</p>
        <p>Dicetak: {formatTanggalWaktu(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
