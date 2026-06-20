import { createClient } from "@/lib/supabase/server";
import type {
  Car,
  Customer,
  Blacklist,
  Booking,
  Expense,
  Settings,
} from "@/lib/types";

/** Aggregated helper functions for fetching common data with joins. */

export async function getCars(): Promise<Car[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Car[];
}

export async function getAvailableCars(): Promise<Car[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("status", "available")
    .order("brand", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Car[];
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getBlacklist(): Promise<Blacklist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blacklist")
    .select("*, customers(name, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Blacklist[];
}

export async function getBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, cars(brand, model, plate, tariff_per_day), customers(name, nik, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function getExpenses(): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*, cars(brand, model, plate)")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function getSettings(): Promise<Settings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }
  return data as Settings;
}

/** Check whether a NIK is on the blacklist. */
export async function isBlacklisted(nik: string): Promise<boolean> {
  if (!nik.trim()) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("blacklist")
    .select("id", { count: "exact", head: true })
    .eq("nik", nik.trim());
  return (count ?? 0) > 0;
}
