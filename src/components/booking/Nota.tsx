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

/** Thermal 80mm receipt - single page compact */
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
  const line = "────────────────────────────────────────";

  return (
    <div className="bg-white px-3 py-2 font-mono text-[10px] leading-tight text-black" id="nota-print-area">
      {/* Header */}
      <div className="text-center">
        <img src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1782311347/u5zbqafgubkyjckrjseq.png" alt={appName} className="mx-auto h-10 w-auto" />
        <p className="font-bold">{appName}</p>
        {phone && <p className="text-[9px]">{phone}</p>}
      </div>
      <p className="text-center text-[8px] text-gray-400">{line}</p>

      {/* Status */}
      <div className="text-center">
        <span className="border border-black px-1.5 py-0.5 text-[9px] font-bold">
          {booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
        </span>
        <span className="ml-2 text-[8px]">#{booking.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <p className="text-center text-[8px] text-gray-400">{line}</p>

      {/* Pelanggan + Kendaraan + Periode - semua 1 block */}
      <div>
        <p className="text-[8px] font-bold">PELANGGAN</p>
        <p className="font-bold">{booking.customers?.name ?? "-"}</p>
        <p>NIK: {booking.customers?.nik ?? "-"} | HP: {booking.customers?.phone ?? "-"}</p>
      </div>
      <div className="mt-1">
        <p className="text-[8px] font-bold">KENDARAAN</p>
        <p>{booking.cars?.brand} {booking.cars?.model} | Plat: {booking.cars?.plate ?? "-"}</p>
      </div>
      <div className="mt-1">
        <p className="text-[8px] font-bold">PERIODE SEWA: {booking.duration_days} Hari</p>
        <p>{formatTanggalWaktu(booking.start_date)} s/d {formatTanggalWaktu(booking.end_date)}</p>
      </div>
      <p className="text-center text-[8px] text-gray-400">{line}</p>

      {/* Biaya */}
      <div className="flex justify-between">
        <span>Sewa Mobil</span>
        <span>{booking.duration_days} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
      </div>
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
      <p className="text-center text-[8px] text-gray-400">{line}</p>
      <div className="flex justify-between font-bold text-[11px]">
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>
      <p className="text-center text-[8px] text-gray-400">{line}</p>

      {/* Ketentuan */}
      <p className="text-[8px] font-bold">KETENTUAN SEWA</p>
      <ol className="list-decimal pl-3 text-[8px] leading-snug">
        {terms.map((t, i) => <li key={i}>{t}</li>)}
      </ol>
      <p className="mt-1 text-center text-[8px] text-gray-400">{line}</p>

      {/* TTD */}
      <div className="mt-1 flex justify-between px-2">
        <div className="text-center">
          <p className="text-[9px]">{signatures.left}</p>
          <div className="mt-8 w-16 border-b border-black" />
        </div>
        <div className="text-center">
          <p className="text-[9px]">{signatures.right}</p>
          <div className="mt-8 w-16 border-b border-black" />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-2 text-center text-[8px]">
        Terima kasih - {appName}
        <br />
        Dicetak: {formatTanggalWaktu(new Date().toISOString())}
      </p>
    </div>
  );
}
