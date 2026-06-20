import Image from "next/image";

interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: "light" | "dark";
}

/** Logo Erlangga Rental Mobil — custom logo image + wordmark.
 *  variant="light"  → background biru, tampilkan logo PUTIH (filter brightness-0 invert).
 *  variant="dark"   → background putih, tampilkan logo berwarna asli.
 */
export function Logo({ size = 36, showText = true, variant = "dark" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-brand-900";
  const subColor = variant === "light" ? "text-brand-100" : "text-accent-600";
  const logoClass =
    variant === "light" ? "object-contain brightness-0 invert" : "object-contain";

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Erlangga Rental Mobil"
        width={size}
        height={size}
        className={logoClass}
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
