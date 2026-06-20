interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: "light" | "dark";
}

/** Logo Erlangga Rental Mobil — car icon + wordmark. */
export function Logo({ size = 36, showText = true, variant = "dark" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-brand-900";
  const subColor = variant === "light" ? "text-brand-100" : "text-accent-600";

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 shadow-md"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 17H3v-5l2-5h11l2 4 3 1v5h-2" />
          <circle cx="7.5" cy="17" r="1.5" fill="#fbbf24" />
          <circle cx="17.5" cy="17" r="1.5" fill="#fbbf24" />
        </svg>
      </div>
      {showText && (
        <div className="leading-tight">
          <div className={`text-base font-extrabold tracking-tight ${textColor}`}>
            Erlangga
          </div>
          <div className={`text-[10px] font-semibold uppercase tracking-widest ${subColor}`}>
            Rental Mobil
          </div>
        </div>
      )}
    </div>
  );
}
