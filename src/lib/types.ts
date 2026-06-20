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
  created_at: string;
  // Joined (optional)
  cars?: Pick<Car, "brand" | "model" | "plate" | "tariff_per_day"> | null;
  customers?: Pick<Customer, "name" | "nik" | "phone"> | null;
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
