import type { Booking } from "@/lib/types";
import { formatRupiah, formatTanggalWaktu } from "@/lib/utils";

interface NotaThermalProps {
  booking: Booking;
  appName?: string;
  phone?: string;
}

/**
 * 80mm thermal receipt layout.
 * Uses inline styles so it stays readable even if Tailwind fails to load
 * inside the browser print dialog / PDF export.
 */
export function NotaThermal({
  booking,
  appName = "Erlangga Rental Mobil",
  phone = "0812-0000-0000",
}: NotaThermalProps) {
  const subtotal = Number(booking.total_cost);
  const lateFee = Number(booking.late_fee || 0);
  const total = subtotal + lateFee;

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
        <p style={{ margin: 0 }}>{phone}</p>
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
        <p style={labelStyle}>PERIODE SEWA: {booking.duration_days} Hari</p>
        <p style={{ margin: 0 }}>
          {formatTanggalWaktu(booking.start_date)} s/d {formatTanggalWaktu(booking.end_date)}
        </p>
        {booking.actual_return_date && (
          <p style={{ margin: "2px 0 0" }}>
            Dikembalikan: {formatTanggalWaktu(booking.actual_return_date)}
          </p>
        )}
      </div>

      {/* Catatan */}
      {booking.notes && (
        <div style={sectionStyle}>
          <p style={labelStyle}>CATATAN</p>
          <p style={{ margin: 0 }}>{booking.notes}</p>
        </div>
      )}

      <div style={dividerStyle} />

      {/* Biaya */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <span>Sewa Mobil</span>
          <span>
            {booking.duration_days} x {formatRupiah(booking.cars?.tariff_per_day ?? 0)}
          </span>
        </div>
        {lateFee > 0 && (
          <div style={rowStyle}>
            <span>Denda Keterlambatan</span>
            <span>{formatRupiah(lateFee)}</span>
          </div>
        )}
      </div>

      <div style={{ ...rowStyle, fontWeight: 700, fontSize: "12px", marginTop: "4px" }}>
        <span>TOTAL</span>
        <span>{formatRupiah(total)}</span>
      </div>

      <div style={dividerStyle} />

      {/* TTD */}
      <div style={{ ...sectionStyle, ...rowStyle, padding: "0 8px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0 }}>Penyewa</p>
          <div style={{ marginTop: "28px", width: "60px", borderBottom: "1px solid #000" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0 }}>Pemilik</p>
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
