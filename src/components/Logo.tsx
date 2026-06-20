import Image from "next/image";

interface LogoProps {
  /** Tinggi (sekaligus lebar, logo kotak) dalam px. */
  size?: number;
  variant?: "light" | "dark";
  /** Tampilkan teks nama di bawah logo */
  showText?: boolean;
}

/** Logo Erlangga Rental Mobil — gambar logo + opsional teks nama.
 *  variant="light"  → background biru, tampilkan logo PUTIH (filter brightness-0 invert).
 *  variant="dark"   → background putih, tampilkan logo berwarna asli.
 */
export function Logo({ size = 40, variant = "dark", showText = false }: LogoProps) {
  const logoClass =
    variant === "light" ? "brightness-0 invert" : "";

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src="https://res.cloudinary.com/dqjh7utdb/image/upload/v1781959408/rcxemimskpt6mnzmbq3c.png"
        alt="Erlangga Rental Mobil"
        width={size}
        height={size}
        className={`object-contain ${logoClass}`}
        priority
        unoptimized
      />
      {showText && (
        <div className="text-center">
          <p className="text-lg font-bold leading-tight">Erlangga</p>
          <p className="text-xs font-medium opacity-80">Rental Mobil</p>
        </div>
      )}
    </div>
  );
}
