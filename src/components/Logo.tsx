import Image from "next/image";

interface LogoProps {
  /** Tinggi (sekaligus lebar, logo kotak) dalam px. */
  size?: number;
  variant?: "light" | "dark";
}

/** Logo Erlangga Rental Mobil — full logo image saja (tanpa wordmark).
 *  variant="light"  → background biru, tampilkan logo PUTIH (filter brightness-0 invert).
 *  variant="dark"   → background putih, tampilkan logo berwarna asli.
 */
export function Logo({ size = 40, variant = "dark" }: LogoProps) {
  const logoClass =
    variant === "light" ? "brightness-0 invert" : "";

  return (
    <Image
      src="/logo.png"
      alt="Erlangga Rental Mobil"
      width={size}
      height={size}
      className={`object-contain ${logoClass}`}
      priority
    />
  );
}
