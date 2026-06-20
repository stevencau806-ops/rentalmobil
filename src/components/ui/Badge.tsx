import type { ReactNode } from "react";

type Tone =
  | "gray"
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "purple"
  | "orange"
  | "amber";

const toneClasses: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-amber-100 text-amber-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({
  children,
  tone = "gray",
  className = "",
  ...props
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
