# 🚗 Erlangga Rental Mobil

Aplikasi web manajemen usaha rental mobil — booking, data pelanggan, blacklist, denda otomatis, pembayaran, pengeluaran operasional, dan laporan. Mobile-friendly (Android, iPhone, laptop).

**Developer:** OOS SHOP · **Stack:** Next.js 15 + Supabase + Tailwind CSS

---

## ✨ Fitur

| # | Fitur | Keterangan |
|---|---|---|
| 1 | Login Admin | Multi-user (3 akun), proteksi semua halaman |
| 2 | Dashboard | Total mobil, tersedia, disewa, pendapatan bulan ini, booking aktif |
| 3 | Data Mobil | CRUD penuh, tarif/hari, status, foto via URL |
| 4 | Data Pelanggan | CRUD, NIK unik, upload URL foto KTP |
| 5 | Blacklist | Penambahan pelanggan bermasalah + **peringatan otomatis** saat NIK terdaftar |
| 6 | Booking Rental | Pilih mobil & pelanggan, hitung durasi & biaya otomatis |
| 7 | Denda Keterlambatan | Dihitung otomatis (denda/jam) saat mobil dikembalikan |
| 8 | Pembayaran | Status Lunas/Belum Bayar + **Cetak Nota** (PDF) |
| 9 | Pengeluaran | Servis, pajak, oli, lainnya — untuk hitung laba bersih |
| 10 | Laporan | Bulanan, Tahunan, Pengeluaran, Riwayat Rental — siap cetak |

---

## 🚀 Cara Setup (5 langkah)

### 1. Install dependencies

```bash
npm install
```

### 2. Buat project Supabase (gratis)

1. Daftar / login di [supabase.com](https://supabase.com)
2. Klik **New Project**, isi nama, password database, region (Singapore untuk Indonesia)
3. Tunggu ±2 menit hingga project aktif

### 3. Setup database

1. Bila project sudah aktif, masuk ke **SQL Editor** → **New query**
2. Buka file `supabase/schema.sql` dari project ini, **copy seluruh isinya**, paste di SQL Editor
3. Klik **Run** — semua tabel, trigger, keamanan (RLS), dan data awal akan dibuat

### 4. Buat 3 akun admin

1. Masuk ke **Authentication** → **Users** → **Add user**
2. Buat **3 akun** dengan email + password (sesuai paket PRD)
3. Setiap akun yang dibuat akan otomatis tercatat di tabel `admins` (via trigger)

### 5. Konfigurasi environment & jalankan

1. Copy `.env.local.example` menjadi `.env.local`
2. Isi dengan kredensial dari **Project Settings → API** di Supabase:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. Jalankan:

   ```bash
   npm run dev
   ```

4. Buka [http://localhost:3000](http://localhost:3000) → login dengan akun admin

---

## 📦 Deploy ke Vercel (gratis)

1. Push project ini ke GitHub
2. Buka [vercel.com](https://vercel.com) → **New Project** → import repo
3. Tambahkan environment variables yang sama (Supabase URL & anon key)
4. **Deploy** — selesai! 🎉

Aplikasi langsung bisa diakses dari HP (install ke home screen untuk pengalaman seperti aplikasi native).

---

## 🗂️ Struktur Project

```
src/
├── app/
│   ├── (auth)/login/         # Halaman login
│   ├── (app)/                # Semua halaman terproteksi
│   │   ├── dashboard/        # Dashboard
│   │   ├── mobil/            # CRUD mobil
│   │   ├── pelanggan/        # CRUD pelanggan + cek blacklist
│   │   ├── blacklist/        # Manajemen blacklist
│   │   ├── booking/          # Booking + denda + pembayaran + nota
│   │   ├── pengeluaran/      # Pengeluaran operasional
│   │   ├── laporan/          # 4 jenis laporan
│   │   └── pengaturan/       # Tarif denda & akun admin
│   └── layout.tsx, page.tsx  # Root
├── components/               # UI + feature components
└── lib/
    ├── supabase/             # Client (browser & server) + middleware
    ├── types.ts              # Type definitions
    ├── queries.ts            # Server-side data fetchers
    └── utils.ts              # Format Rupiah, tanggal, hitung denda

supabase/
└── schema.sql                # Database schema lengkap + RLS + trigger
```

---

## 🔐 Keamanan

- **Row Level Security (RLS)** aktif di semua tabel — hanya user ter-autentikasi yang bisa akses data
- Middleware Next.js melindungi semua route `/dashboard/*`
- Password di-hash & dikelola Supabase Auth (standar industri)

---

## 🆘 Troubleshooting

| Masalah | Solusi |
|---|---|
| Login gagal | Pastikan akun sudah dibuat di Authentication → Users, dan email terverifikasi (atau matikan "Confirm email" di Auth settings) |
| Data tidak muncul | Pastikan `schema.sql` sudah dijalankan & env vars terisi benar |
| Tidak bisa tambah data | Cek RLS — pastikan query `schema.sql` berjalan tanpa error |
| Mobil tidak kembali "Tersedia" | Pastikan booking diselesaikan + ditandai "Lunas" |

---

© Erlangga Rental Mobil · Dibuat oleh **OOS SHOP**
