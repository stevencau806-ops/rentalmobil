import type { Booking, AdditionalFine } from "@/lib/types";
import { formatRupiah, formatTanggalWaktu } from "@/lib/utils";

interface NotaThermalProps {
  booking: Booking;
  appName?: string;
  phone?: string | null;
  notaTerms?: string | null;
  notaSignatures?: string | null;
}

/**
 * 80mm thermal receipt layout.
 * Uses inline styles so it stays readable even if Tailwind fails to load
 * inside the browser print dialog / PDF export.
 */
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

export function NotaThermal({
  booking,
  appName = "Erlangga Rental Mobil",
  phone,
  notaTerms,
  notaSignatures,
}: NotaThermalProps) {
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

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    lineHeight: 1.4,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "6px",
  };

  const dividerStyle: React.CSSProperties = {
    borderBottom: "1px dashed #000",
    margin: "6px 0",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "9px",
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: "0.3px",
  };

  return (
    <div
      id="nota-thermal-print-area"
      className="nota-thermal"
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "2mm",
        fontFamily: '"Inter", "Arial", sans-serif',
        fontSize: "10px",
        lineHeight: 1.35,
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ ...sectionStyle, textAlign: "center" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 2px" }}>{appName}</p>
        {phone && <p style={{ margin: 0 }}>{phone}</p>}
      </div>
      <div style={dividerStyle} />

      {/* Status */}
      <div style={{ ...sectionStyle, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            border: "1px solid #000",
            padding: "2px 6px",
            fontWeight: 700,
            fontSize: "11px",
          }}
        >
          {booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}
        </span>
        <span style={{ marginLeft: "6px", fontSize: "9px" }}>
          #{booking.id.slice(0, 8).toUpperCase()}
        </span>
      </div>
      <div style={dividerStyle} />

      {/* Pelanggan */}
      <div style={sectionStyle}>
        <p style={labelStyle}>PELANGGAN</p>
        <p style={{ fontWeight: 600, margin: 0 }}>{booking.customers?.name ?? "-"}</p>
        <p style={{ margin: 0 }}>NIK: {booking.customers?.nik ?? "-"}</p>
        <p style={{ margin: 0 }}>HP: {booking.customers?.phone ?? "-"}</p>
      </div>

      {/* Kendaraan */}
      <div style={sectionStyle}>
        <p style={labelStyle}>KENDARAAN</p>
        <p style={{ margin: 0 }}>
          {booking.cars?.brand} {booking.cars?.model} | Plat: {booking.cars?.plate ?? "-"}
        </p>
      </div>

      {/* Periode */}
      <div style={sectionStyle}>
        <p style={labelStyle}>PERIODE SEWA: {originalDays} Hari</p>
        <p style={{ margin: 0 }}>
          {formatTanggalWaktu(booking.start_date)} s/d {originalEndDate ? formatTanggalWaktu(originalEndDate) : formatTanggalWaktu(booking.end_date)}
        </p>
        {extendedDays > 0 && (
          <>
            <p style={{ ...labelStyle, margin: "4px 0 0" }}>PERPANJANGAN: +{extendedDays} Hari</p>
            <p style={{ margin: 0 }}>
              {originalEndDate ? formatTanggalWaktu(originalEndDate) : ""} s/d {formatTanggalWaktu(booking.end_date)}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "9px" }}>Total: {booking.duration_days} Hari</p>
          </>
        )}
        {booking.actual_return_date && (
          <p style={{ margin: "2px 0 0" }}>
            Dikembalikan: {formatTanggalWaktu(booking.actual_return_date)}
          </p>
        )}
      </div>

      {/* Catatan */}
      {cleanNotes && (
        <div style={sectionStyle}>
          <p style={labelStyle}>CATATAN</p>
          <p style={{ margin: 0 }}>{cleanNotes}</p>
        </div>
      )}

      <div style={dividerStyle} />

      {/* Biaya */}
      <div style={sectionStyle}>
        {extendedDays > 0 ? (
          <>
            <div style={rowStyle}>
              <span>Sewa Awal</span>
              <span>{originalDays} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
            </div>
            <div style={rowStyle}>
              <span>Perpanjangan</span>
              <span>{extendedDays} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
            </div>
          </>
        ) : (
          <div style={rowStyle}>
            <span>Sewa Mobil</span>
            <span>{booking.duration_days} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span>
          </div>
        )}
        {lateFee > 0 && (
          <div style={rowStyle}>
            <span>Denda Keterlambatan</span>
            <span>{formatRupiah(lateFee)}</span>
          </div>
        )}
        {additionalFinesList.map((fine, i) => (
          <div key={i} style={rowStyle}>
            <span>Denda: {fine.label || fine.type}</span>
            <span>{formatRupiah(fine.amount)}</span>
          </div>
        ))}
      </div>

      <div style={{ ...rowStyle, fontWeight: 700, fontSize: "12px", marginTop: "4px" }}>
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>

      <div style={dividerStyle} />

      {/* Ketentuan */}
      <div style={sectionStyle}>
        <p style={labelStyle}>KETENTUAN SEWA</p>
        <ol style={{ paddingLeft: "12px", margin: "2px 0 0", fontSize: "9px", lineHeight: 1.45 }}>
          {terms.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      </div>
      <div style={dividerStyle} />

      {/* TTD */}
      <div style={{ ...sectionStyle, ...rowStyle, padding: "0 8px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0 }}>{signatures.left}</p>
          <div style={{ marginTop: "28px", width: "60px", borderBottom: "1px solid #000" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0 }}>{signatures.right}</p>
          <div style={{ marginTop: "28px", width: "60px", borderBottom: "1px solid #000" }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "9px", marginTop: "8px" }}>
        <p style={{ margin: 0 }}>Terima kasih - {appName}</p>
        <p style={{ margin: 0 }}>Dicetak: {formatTanggalWaktu(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
