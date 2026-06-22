"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Share2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const checkShouldShow = useCallback(() => {
    // Already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return false;

    // Dismissed recently (3 days cooldown)
    const dismissed = localStorage.getItem("pwa-dismiss");
    if (dismissed && Date.now() - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return false;

    return true;
  }, []);

  useEffect(() => {
    if (!checkShouldShow()) return;

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show after short delay
    const timer = setTimeout(() => setShowPrompt(true), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [checkShouldShow]);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem("pwa-dismiss", Date.now().toString());
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[9999] sm:left-auto sm:right-4 sm:w-80 animate-slide-up">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-white" />
            <span className="text-white text-xs font-medium">Install Aplikasi</span>
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dfxc4ceya/image/upload/w_96,h_96,c_fill/v1782120655/icon-512x512_tuodrb.png"
              alt="App"
              className="w-11 h-11 rounded-xl"
            />
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Erlangga Rental Mobil</p>
              <p className="text-[11px] text-slate-500">Akses cepat dari home screen</p>
            </div>
          </div>

          {isIOS && !deferredPrompt ? (
            <div className="mt-3 bg-slate-50 rounded-lg p-2.5 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-[11px] text-slate-600">
                Tap <strong>Share</strong> di bawah, lalu pilih <strong>&quot;Add to Home Screen&quot;</strong>
              </p>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Install Sekarang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
