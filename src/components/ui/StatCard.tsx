import type { ReactNode } from "react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "slate";
  hint?: string;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  blue: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
  slate: "bg-slate-100 text-slate-700",
};

// Gradient backgrounds for mobile colorful mode
const mobileGradients: Record<NonNullable<StatCardProps["tone"]>, string> = {
  blue: "from-blue-500 to-cyan-500",
  green: "from-emerald-500 to-teal-500",
  amber: "from-orange-500 to-amber-500",
  red: "from-red-500 to-rose-500",
  purple: "from-violet-500 to-purple-600",
  slate: "from-slate-500 to-gray-600",
};

export function StatCard({ label, value, icon, tone = "blue", hint }: StatCardProps) {
  return (
    <>
      {/* Mobile: colorful gradient card */}
      <div className={`md:hidden rounded-2xl bg-gradient-to-br ${mobileGradients[tone]} p-4 text-white shadow-md`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/80">
              {label}
            </p>
            <p className="mt-1 text-xl font-bold">{value}</p>
            {hint && <p className="mt-1 text-[11px] text-white/70">{hint}</p>}
          </div>
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg">
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: original style */}
      <Card className="hidden md:block p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
          </div>
          {icon && (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${toneClasses[tone]}`}>
              {icon}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
