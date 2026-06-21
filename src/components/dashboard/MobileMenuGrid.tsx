"use client";

import Link from "next/link";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
}

const menuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    gradient: "from-violet-500 to-purple-600",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10" />
      </svg>
    ),
  },
  {
    href: "/mobil",
    label: "Data Mobil",
    gradient: "from-blue-500 to-cyan-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3v-5l2-5h11l2 4 3 1v5h-2M7 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0M17 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0" />
      </svg>
    ),
  },
  {
    href: "/pelanggan",
    label: "Pelanggan",
    gradient: "from-emerald-500 to-teal-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM6 21v-1a6 6 0 0112 0v1" />
      </svg>
    ),
  },
  {
    href: "/blacklist",
    label: "Blacklist",
    gradient: "from-red-500 to-rose-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM4.93 4.93l14.14 14.14" />
      </svg>
    ),
  },
  {
    href: "/booking",
    label: "Booking",
    gradient: "from-orange-500 to-amber-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: "/pengeluaran",
    label: "Pengeluaran",
    gradient: "from-pink-500 to-fuchsia-500",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: "/laporan",
    label: "Laporan",
    gradient: "from-indigo-500 to-blue-600",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "/qris",
    label: "QRIS",
    gradient: "from-rose-500 to-red-600",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14v3h3M14 14h3v7" />
      </svg>
    ),
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    gradient: "from-slate-500 to-gray-600",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export function MobileMenuGrid() {
  return (
    <div className="block md:hidden">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Menu Utama</h2>
      <div className="grid grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br ${item.gradient} p-4 text-white shadow-md transition-transform active:scale-95`}
          >
            <span className="drop-shadow-sm">{item.icon}</span>
            <span className="text-[11px] font-semibold leading-tight text-center drop-shadow-sm">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
