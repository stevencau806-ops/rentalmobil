"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone (installed) mode
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Already installed, don't show

    // Check if dismissed recently (don't show again for 7 days)
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show prompt after 3 seconds (no beforeinstallprompt event)
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome - listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  }

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-slide-up sm:left-auto sm:right-4 sm:w-80">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="flex-shrink-0 rounded-xl overflow-hidden w-12 h-12 bg-blue-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dfxc4ceya/image/upload/v1782120655/icon-512x512_tuodrb.png"
              alt="App icon"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm">
              Install Erlangga Rental
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akses lebih cepat langsung dari home screen HP kamu
            </p>
          </div>
        </div>

        {isIOS ? (
          // iOS instructions
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 flex-shrink-0" />
              Tap <strong className="mx-0.5">Share</strong> lalu pilih{" "}
              <strong className="mx-0.5">&quot;Add to Home Screen&quot;</strong>
            </p>
          </div>
        ) : (
          // Android/Chrome install button
          <button
            onClick={handleInstall}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Install Sekarang
          </button>
        )}
      </div>
    </div>
  );
}
