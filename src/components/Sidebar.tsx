"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <Icon path="M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10" />,
  },
  {
    href: "/mobil",
    label: "Data Mobil",
    icon: <Icon path="M5 17H3v-5l2-5h11l2 4 3 1v5h-2M7 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0M17 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0" />,
  },
  {
    href: "/pelanggan",
    label: "Data Pelanggan",
    icon: <Icon path="M16 11a4 4 0 10-8 0 4 4 0 008 0zM6 21v-1a6 6 0 0112 0v1" />,
  },
  {
    href: "/blacklist",
    label: "Blacklist",
    icon: <Icon path="M12 2a10 10 0 100 20 10 10 0 000-20zM4.93 4.93l14.14 14.14" />,
  },
  {
    href: "/booking",
    label: "Booking Rental",
    icon: <Icon path="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  },
  {
    href: "/pengeluaran",
    label: "Pengeluaran",
    icon: <Icon path="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  },
  {
    href: "/laporan",
    label: "Laporan",
    icon: <Icon path="M3 3v18h18M7 14l4-4 3 3 5-6" />,
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    icon: <Icon path="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  },
];

function Icon({ path }: { path: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-brand-800 bg-brand-900 px-4 py-2.5 text-white md:hidden">
        <Logo size={40} variant="light" />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          className="rounded-md p-2 hover:bg-brand-800"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80%] overflow-y-auto bg-brand-900 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-800 px-4 py-4">
              <Logo size={44} variant="light" />
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 hover:bg-brand-800" aria-label="Tutup menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <NavList items={navItems} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
            <UserFooter userEmail={userEmail} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 text-white md:flex">
        <div className="border-b border-brand-800 px-5 py-5">
          <Logo size={140} variant="light" />
        </div>
        <NavList items={navItems} isActive={isActive} />
        <UserFooter userEmail={userEmail} />
      </aside>
    </>
  );
}

function NavList({
  items,
  isActive,
  onNavigate,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive(item.href)
              ? "bg-brand-700 text-white shadow-sm"
              : "text-brand-100 hover:bg-brand-800 hover:text-white"
          }`}
        >
          <span className="shrink-0">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function UserFooter({ userEmail }: { userEmail?: string | null }) {
  return (
    <div className="border-t border-brand-800 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-brand-200">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
          {(userEmail?.[0] ?? "A").toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-white">{userEmail ?? "admin"}</p>
          <p className="text-brand-300">Administrator</p>
        </div>
      </div>
    </div>
  );
}
