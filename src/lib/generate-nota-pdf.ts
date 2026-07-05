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

export interface NotaPrintOptions {
  booking: Booking;
  appName?: string;
  phone?: string | null;
  notaTerms?: string | null;
  notaSignatures?: string | null;
}

export function generateNotaPDF(options: NotaPrintOptions) {
  const { booking, appName = "Erlangga Rental Mobil", phone, notaTerms, notaSignatures } = options;

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

  // Parse extension info from notes
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

  // Build terms HTML
  const termsHtml = terms.map((t, i) => `<li>${i + 1}. ${t}</li>`).join("");

  // Build biaya rows
  let biayaHtml = "";
  if (extendedDays > 0) {
    biayaHtml += `<div class="row"><span>Sewa Awal</span><span>${originalDays} x ${formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span></div>`;
    biayaHtml += `<div class="row"><span>Perpanjangan</span><span>${extendedDays} x ${formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span></div>`;
  } else {
    biayaHtml += `<div class="row"><span>Sewa Mobil</span><span>${booking.duration_days} x ${formatRupiah(booking.cars?.tariff_per_day ?? 0)}</span></div>`;
  }
  if (lateFee > 0) {
    biayaHtml += `<div class="row"><span>Denda Keterlambatan</span><span>${formatRupiah(lateFee)}</span></div>`;
  }
  for (const fine of additionalFinesList) {
    biayaHtml += `<div class="row"><span>Denda: ${fine.label || fine.type}</span><span>${formatRupiah(fine.amount)}</span></div>`;
  }

  // Periode section
  let periodeHtml = `<div style="font-size:11px;font-weight:bold;margin-bottom:2px">PERIODE SEWA: ${originalDays} Hari</div>`;
  periodeHtml += `<div style="font-size:11px">${formatTanggalWaktu(booking.start_date)} s/d ${originalEndDate ? formatTanggalWaktu(originalEndDate) : formatTanggalWaktu(booking.end_date)}</div>`;
  if (extendedDays > 0) {
    periodeHtml += `<div style="font-size:11px;font-weight:bold;margin-top:3px">PERPANJANGAN: +${extendedDays} Hari</div>`;
    periodeHtml += `<div style="font-size:11px">${originalEndDate ? formatTanggalWaktu(originalEndDate) : ""} s/d ${formatTanggalWaktu(booking.end_date)}</div>`;
    periodeHtml += `<div style="font-size:11px;margin-top:2px">Total: ${booking.duration_days} Hari</div>`;
  }
  if (booking.actual_return_date) {
    periodeHtml += `<div style="font-size:11px;margin-top:2px">Dikembalikan: ${formatTanggalWaktu(booking.actual_return_date)}</div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nota Sewa - ${booking.id.slice(0, 8).toUpperCase()}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; background:#f5f5f5; padding:20px; }
  .receipt { background:#fff; max-width:320px; margin:0 auto; padding:20px; border-radius:8px; box-shadow:0 2px 20px rgba(0,0,0,.1); }
  .center { text-align:center; }
  .bold { font-weight:bold; }
  .divider { border:none; border-top:1px dashed #333; margin:8px 0; }
  .row { display:flex; justify-content:space-between; font-size:11px; margin:2px 0; }
  .row.total { font-size:14px; font-weight:bold; margin:6px 0; padding:5px 0; border-top:1px solid #333; border-bottom:1px solid #333; }
  .section { margin-bottom:6px; }
  .section-title { font-size:10px; font-weight:bold; margin-bottom:2px; letter-spacing:0.5px; }
  .terms { font-size:9px; line-height:1.4; list-style:none; padding:0; margin:0; }
  .terms li { margin-bottom:1px; }
  .signatures { display:flex; justify-content:space-between; padding:0 10px; margin-top:8px; }
  .sig-box { text-align:center; }
  .sig-line { width:60px; border-bottom:1px solid #333; margin-top:30px; }
  .status-badge { display:inline-block; border:1px solid #333; padding:1px 6px; font-size:11px; font-weight:bold; }
  .footer { text-align:center; font-size:9px; color:#666; margin-top:8px; }
  .actions { text-align:center; margin-top:20px; padding-top:16px; border-top:1px solid #eee; }
  .actions button { padding:12px 24px; margin:4px; border-radius:8px; border:none; font-size:13px; font-weight:bold; cursor:pointer; }
  .btn-print { background:#1e293b; color:#fff; }
  .btn-print:hover { background:#334155; }
  .btn-close { background:#f97316; color:#fff; }
  .btn-close:hover { background:#ea580c; }
  @media print {
    body { background:#fff; padding:0; margin:0; }
    .receipt { box-shadow:none; border-radius:0; max-width:80mm; padding:2mm; }
    .actions { display:none !important; }
  }
</style>
</head>
<body>
<div class="receipt">
  <!-- Header -->
  <div class="center section">
    <div style="font-size:15px;font-weight:bold">${appName}</div>
    ${phone ? `<div style="font-size:11px">${phone}</div>` : ""}
  </div>
  <hr class="divider">

  <!-- Status -->
  <div class="center section">
    <span class="status-badge">${booking.payment_status === "paid" ? "LUNAS" : "BELUM BAYAR"}</span>
    <span style="margin-left:6px;font-size:10px">#${booking.id.slice(0, 8).toUpperCase()}</span>
  </div>
  <hr class="divider">

  <!-- Pelanggan -->
  <div class="section">
    <div class="section-title">PELANGGAN</div>
    <div style="font-size:12px;font-weight:bold">${booking.customers?.name ?? "-"}</div>
    <div style="font-size:10px">NIK: ${booking.customers?.nik ?? "-"} | HP: ${booking.customers?.phone ?? "-"}</div>
  </div>

  <!-- Kendaraan -->
  <div class="section">
    <div class="section-title">KENDARAAN</div>
    <div style="font-size:11px">${booking.cars?.brand ?? ""} ${booking.cars?.model ?? ""} | Plat: ${booking.cars?.plate ?? "-"}</div>
  </div>

  <!-- Periode -->
  <div class="section">
    ${periodeHtml}
  </div>

  <!-- Catatan -->
  ${cleanNotes ? `<div class="section"><div class="section-title">CATATAN</div><div style="font-size:11px">${cleanNotes}</div></div>` : ""}

  <hr class="divider">

  <!-- Biaya -->
  <div class="section">
    ${biayaHtml}
  </div>
  <div class="row total">
    <span>TOTAL</span>
    <span>${formatRupiah(total)}</span>
  </div>
  <hr class="divider">

  <!-- Ketentuan -->
  <div class="section">
    <div class="section-title">KETENTUAN SEWA</div>
    <ul class="terms">${termsHtml}</ul>
  </div>
  <hr class="divider">

  <!-- TTD -->
  <div class="signatures">
    <div class="sig-box">
      <div style="font-size:11px">${signatures.left}</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-box">
      <div style="font-size:11px">${signatures.right}</div>
      <div class="sig-line"></div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>Terima kasih - ${appName}</div>
    <div>Dicetak: ${formatTanggalWaktu(new Date().toISOString())}</div>
  </div>
</div>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨️ Cetak Struk</button>
  <button class="btn-close" onclick="window.close()">✓ Selesai</button>
</div>
</body>
</html>`;

  // Open in new window (like Warung-Efge approach)
  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  } else {
    // Fallback: fullscreen iframe overlay if popup blocked (mobile)
    const overlay = document.createElement("div");
    overlay.id = "nota-print-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:16px;overflow-y:auto;";

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "width:100%;max-width:340px;height:auto;min-height:600px;border:none;border-radius:12px;background:white;flex-shrink:0;";
    iframe.srcdoc = html;

    const printBtn = document.createElement("button");
    printBtn.textContent = "🖨️ Cetak";
    printBtn.style.cssText = "margin-top:12px;padding:12px 28px;background:#1e293b;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;";
    printBtn.onclick = () => { iframe.contentWindow?.print(); };

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Tutup";
    closeBtn.style.cssText = "margin-top:8px;padding:12px 28px;background:#f97316;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;";
    closeBtn.onclick = () => document.body.removeChild(overlay);

    overlay.appendChild(iframe);
    overlay.appendChild(printBtn);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
  }
}
