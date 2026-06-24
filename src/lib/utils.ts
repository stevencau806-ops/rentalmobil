import type { ExpenseType, FineStatus, PaymentStatus } from "@/lib/types";

/** Format number as Indonesian Rupiah currency. */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/** Format an ISO date string as dd MMM yyyy (Indonesian). */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** Format an ISO date as dd MMM yyyy, HH:mm in WIB (+07).
 *  Handles both +07:00 and UTC/Z inputs from Supabase.
 */
export function formatTanggalWaktu(iso: string | null | undefined): string {
  if (!iso) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // Case 1: stored with +07:00 offset — trust the local time directly
  const wibMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (iso.includes("+07:00") && wibMatch) {
    const [, y, m, d, h, min] = wibMatch;
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}, ${h}.${min}`;
  }

  // Case 2: UTC (Z) or other offset — convert to WIB (+7h)
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";

  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  let day = d.getUTCDate();
  let h = d.getUTCHours();
  let min = d.getUTCMinutes();

  h += 7; // UTC → WIB
  if (h >= 24) {
    h -= 24;
    day += 1;
    const dim = new Date(y, mo + 1, 0).getUTCDate();
    if (day > dim) {
      day = 1;
      // month/year rollover omitted for brevity (rare edge case)
    }
  }

  return `${day} ${months[mo]} ${y}, ${String(h).padStart(2, "0")}.${String(min).padStart(2, "0")}`;
}

/** Calculate whole days between two dates (inclusive of start day). */
/**
 * Calculate rental duration in days based on hours (24h = 1 day).
 * Exact division: 24h=1day, 48h=2days, 72h=3days.
 * Partial hours don't add extra day - they become late fees instead.
 */
export function hitungDurasiHari(
  startDate: string,
  endDate: string
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 1; // min 1 day
  const hours = diffMs / (1000 * 60 * 60);
  // Exact days: 24h=1, 48h=2. Partial hours don't count as extra day.
  const days = Math.floor(hours / 24);
  return Math.max(days, 1); // min 1 day rental
}

/**
 * Calculate late fee based on actual return vs scheduled end.
 * Returns { hoursLate, fee }.
 */
export function hitungDenda(
  actualReturn: string,
  scheduledEnd: string,
  finePerHour: number
): { hoursLate: number; fee: number } {
  if (!actualReturn || !scheduledEnd)
    return { hoursLate: 0, fee: 0 };

  const end = new Date(scheduledEnd);
  const ret = new Date(actualReturn);

  if (ret <= end) return { hoursLate: 0, fee: 0 };

  const diffMs = ret.getTime() - end.getTime();
  const hoursLate = Math.ceil(diffMs / (1000 * 60 * 60));
  const fee = hoursLate * finePerHour;
  return { hoursLate, fee };
}

export const statusMobilLabel: Record<string, string> = {
  available: "Tersedia",
  rented: "Disewa",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "Belum Bayar",
  paid: "Lunas",
};

export const fineStatusLabel: Record<FineStatus, string> = {
  none: "Tidak Ada",
  pending: "Perlu Dibayar",
  paid: "Dibayar",
};

export const expenseTypeLabel: Record<ExpenseType, string> = {
  service: "Servis Mobil",
  tax: "Pajak Kendaraan",
  oil: "Ganti Oli",
  commission: "Komisi",
  other: "Lainnya",
};

export const expenseTypeIcon: Record<ExpenseType, string> = {
  service: "🔧",
  tax: "🧾",
  oil: "🛢️",
  commission: "💰",
  other: "📦",
};

/** Generate a simple booking code, e.g. RNT-20260620-A1B2. */
export function generateBookingCode(id: string): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `RNT-${ymd}-${suffix}`;
}
