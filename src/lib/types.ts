export type CarStatus = "available" | "rented";

export interface Car {
  id: string;
  brand: string;
  model: string;
  plate: string;
  year: number | null;
  tariff_per_day: number;
  status: CarStatus;
  photo_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  nik: string;
  phone: string | null;
  address: string | null;
  ktp_url: string | null;
  created_at: string;
}

export interface Blacklist {
  id: string;
  customer_id: string | null;
  nik: string;
  reason: string;
  created_at: string;
  // Joined (optional)
  customers?: Pick<Customer, "name" | "phone"> | null;
}

export type PaymentStatus = "unpaid" | "paid";
export type FineStatus = "none" | "pending" | "paid";

export interface Booking {
  id: string;
  car_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  total_cost: number;
  late_fee: number;
  fine_status: FineStatus;
  payment_status: PaymentStatus;
  actual_return_date: string | null;
  notes: string | null;
  additional_fines: string | null; // JSON: AdditionalFine[]
  created_at: string;
  // Joined (optional)
  cars?: Pick<Car, "brand" | "model" | "plate" | "tariff_per_day"> | null;
  customers?: Pick<Customer, "name" | "nik" | "phone"> | null;
}

export interface AdditionalFine {
  type: string; // e.g. "bbm", "kerusakan", "lainnya"
  label: string; // display name
  amount: number;
}

export type ExpenseType = "service" | "tax" | "oil" | "other";

export interface Expense {
  id: string;
  type: ExpenseType;
  car_id: string | null;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  // Joined (optional)
  cars?: Pick<Car, "brand" | "model" | "plate"> | null;
}

export interface Settings {
  id: string;
  fine_per_hour: number;
  app_name: string;
  phone: string | null;
  nota_terms: string | null; // JSON array of strings
  nota_signatures: string | null; // JSON: { left: string, right: string }
  qris_url: string | null; // URL gambar QRIS
  fine_types: string | null; // JSON: FineType[]
}

export interface FineType {
  key: string;
  label: string;
  emoji: string;
}

// Form input types (no id, no timestamps)
export type CarInput = Omit<Car, "id" | "created_at">;
export type CustomerInput = Omit<Customer, "id" | "created_at">;
export type BookingInput = Omit<
  Booking,
  "id" | "created_at" | "cars" | "customers"
>;
export type ExpenseInput = Omit<Expense, "id" | "created_at" | "cars">;
export type BlacklistInput = Omit<Blacklist, "id" | "created_at" | "customers">;
