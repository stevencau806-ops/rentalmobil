import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/NavigationProgress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Erlangga Rental Mobil",
  description:
    "Sistem pengelolaan usaha rental mobil — booking, pelanggan, pembayaran, dan laporan.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "https://res.cloudinary.com/dfxc4ceya/image/upload/v1782120655/icon-512x512_tuodrb.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "https://res.cloudinary.com/dfxc4ceya/image/upload/v1782120655/icon-512x512_tuodrb.png",
  },
};

export const viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
