-- Migration: Tambah kolom phone ke tabel settings
-- Jalankan di Supabase Dashboard → SQL Editor → New Query

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS phone text;
