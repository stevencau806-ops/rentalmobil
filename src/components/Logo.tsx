import Image from "next/image";

interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: "light" | "dark";
}

/** Logo Erlangga Rental Mobil — custom logo image + wordmark. */
export function Logo({ size = 36, showText = true, variant = "dark" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-brand-900";
  const subColor = variant === "light" ? "text-brand-100" : "text-accent-600";

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Erlangga Rental Mobil"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
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
