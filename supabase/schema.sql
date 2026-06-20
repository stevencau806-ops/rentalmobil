-- ============================================================================
-- Erlangga Rental Mobil — Database Schema (Supabase / PostgreSQL)
-- ============================================================================
-- Jalankan seluruh isi file ini di: Supabase Dashboard → SQL Editor → New Query
-- Aman untuk dijalankan ulang (idempotent menggunakan DROP IF EXISTS / IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_status') THEN
    CREATE TYPE car_status AS ENUM ('available', 'rented');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'paid');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fine_status') THEN
    CREATE TYPE fine_status AS ENUM ('none', 'pending', 'paid');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_type') THEN
    CREATE TYPE expense_type AS ENUM ('service', 'tax', 'oil', 'other');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Admin profiles (linked to auth.users). Multi-user (3 akun sesuai PRD).
CREATE TABLE IF NOT EXISTS public.admins (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- App-wide settings (single row).
CREATE TABLE IF NOT EXISTS public.settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name      text NOT NULL DEFAULT 'Erlangga Rental Mobil',
  phone         text,
  fine_per_hour numeric NOT NULL DEFAULT 25000,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Master data mobil
CREATE TABLE IF NOT EXISTS public.cars (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand          text NOT NULL,
  model          text NOT NULL,
  plate          text NOT NULL UNIQUE,
  year           integer,
  tariff_per_day numeric NOT NULL DEFAULT 0 CHECK (tariff_per_day >= 0),
  status         car_status NOT NULL DEFAULT 'available',
  photo_url      text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Master data pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  nik        text NOT NULL UNIQUE,
  phone      text,
  address    text,
  ktp_url    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Blacklist pelanggan bermasalah (by NIK agar tetap bisa cek walau data berubah)
CREATE TABLE IF NOT EXISTS public.blacklist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  nik         text NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blacklist_nik ON public.blacklist(nik);

-- Booking rental
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id              uuid NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  duration_days       integer NOT NULL DEFAULT 1 CHECK (duration_days >= 1),
  total_cost          numeric NOT NULL DEFAULT 0,
  late_fee            numeric NOT NULL DEFAULT 0,
  fine_status         fine_status NOT NULL DEFAULT 'none',
  payment_status      payment_status NOT NULL DEFAULT 'unpaid',
  actual_return_date  timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_date_check CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON public.bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON public.bookings(payment_status);

-- Pengeluaran operasional
CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        expense_type NOT NULL,
  car_id      uuid REFERENCES public.cars(id) ON DELETE SET NULL,
  amount      numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description text,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- ----------------------------------------------------------------------------
-- 2. SETTINGS SEED (single row)
-- ----------------------------------------------------------------------------
INSERT INTO public.settings (app_name, fine_per_hour)
SELECT 'Erlangga Rental Mobil', 25000
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- ----------------------------------------------------------------------------
-- 3. AUTO SYNC car status via triggers
-- ----------------------------------------------------------------------------
-- When a booking is created → car becomes 'rented'
-- When a booking is marked paid AND has actual_return_date → car back to 'available'
-- (The app also handles this in JS; triggers ensure DB consistency.)

CREATE OR REPLACE FUNCTION public.fn_sync_car_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.cars SET status = 'rented' WHERE id = NEW.car_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Returned & paid → free the car
    IF NEW.actual_return_date IS NOT NULL
       AND NEW.payment_status = 'paid'
       AND (OLD.actual_return_date IS NULL OR OLD.payment_status <> 'paid') THEN
      UPDATE public.cars SET status = 'available' WHERE id = NEW.car_id;
    END IF;
    -- If booking cancelled (deleted elsewhere) we don't re-open here; handled by delete trigger.
    RETURN NEW;
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.fn_free_car_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If a booking is deleted and no other active booking uses the car, free it.
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = OLD.car_id
      AND b.id <> OLD.id
      AND b.actual_return_date IS NULL
  ) THEN
    UPDATE public.cars SET status = 'available' WHERE id = OLD.car_id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_booking_sync_car ON public.bookings;
CREATE TRIGGER trg_booking_sync_car
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_car_status();

DROP TRIGGER IF EXISTS trg_booking_free_car ON public.bookings;
CREATE TRIGGER trg_booking_free_car
  AFTER DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_free_car_on_delete();

-- ----------------------------------------------------------------------------
-- 4. AUTO-CREATE admin profile on new auth signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admins (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE public.admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses  ENABLE ROW LEVEL SECURITY;

-- Policies: only authenticated users (admins) can do everything.
-- Public/anonymous = no access.
DROP POLICY IF EXISTS "auth_admins_select"    ON public.admins;
DROP POLICY IF EXISTS "auth_admins_update"    ON public.admins;
DROP POLICY IF EXISTS "auth_settings_all"     ON public.settings;
DROP POLICY IF EXISTS "auth_cars_all"         ON public.cars;
DROP POLICY IF EXISTS "auth_customers_all"    ON public.customers;
DROP POLICY IF EXISTS "auth_blacklist_all"    ON public.blacklist;
DROP POLICY IF EXISTS "auth_bookings_all"     ON public.bookings;
DROP POLICY IF EXISTS "auth_expenses_all"     ON public.expenses;

CREATE POLICY "auth_admins_select" ON public.admins
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_admins_update" ON public.admins
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_settings_all" ON public.settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_cars_all" ON public.cars
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_customers_all" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_blacklist_all" ON public.blacklist
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_bookings_all" ON public.bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_expenses_all" ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. OPTIONAL DEMO SEED DATA (uncomment to populate sample cars)
-- ----------------------------------------------------------------------------
-- INSERT INTO public.cars (brand, model, plate, year, tariff_per_day, photo_url)
-- VALUES
--   ('Toyota', 'Avanza', 'B 1234 XX', 2022, 350000, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341'),
--   ('Honda', 'Brio',    'B 5678 YY', 2023, 300000, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70'),
--   ('Mitsubishi', 'Xpander', 'B 9012 ZZ', 2021, 400000, NULL)
-- ON CONFLICT (plate) DO NOTHING;

-- ============================================================================
-- SETUP INSTRUKSI (setelah query ini dijalankan):
-- 1. Buat 3 akun admin di: Authentication → Users → Add user
--    (email + password). Trigger akan otomatis membuat row di tabel admins.
-- 2. (Opsional) Uncomment seed di atas untuk data mobil contoh.
-- ============================================================================
