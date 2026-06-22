"use client";

import { useState, useEffect } from "react";
import { X, Download, Share2, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Dismissed recently
    const dismissed = localStorage.getItem("pwa-no");
    if (dismissed && Date.now() - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show after delay
    setTimeout(() => setShow(true), 3000);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") { setShow(false); return; }
      } catch { /* ignore */ }
      setDeferredPrompt(null);
    }
    // If no native prompt or user dismissed, just hide
    setShow(false);
    localStorage.setItem("pwa-no", Date.now().toString());
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem("pwa-no", Date.now().toString());
  }

  if (!show) return null;

  const hasNativePrompt = !!deferredPrompt;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[9999] sm:left-auto sm:right-4 sm:max-w-sm animate-slide-up">
      <div className="rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-700 px-4 py-2 flex items-center justify-between">
          <span className="text-white text-xs font-medium flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Install Aplikasi
          </span>
          <button onClick={dismiss} className="text-white/70 hover:text-white p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192x192.png" alt="" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="font-semibold text-sm text-slate-900">Erlangga Rental</p>
              <p className="text-[10px] text-slate-500">Akses cepat dari home screen</p>
            </div>
          </div>

          {hasNativePrompt ? (
            <button
              onClick={handleInstall}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" /> Install
            </button>
          ) : (
            <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600">
              {isIOS ? (
                <p className="flex items-start gap-2">
                  <Share2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Tap <strong>Share</strong> di bawah → <strong>&quot;Add to Home Screen&quot;</strong></span>
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <MoreVertical className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Tap <strong>&#8942;</strong> di kanan atas → <strong>&quot;Install app&quot;</strong> atau <strong>&quot;Add to Home Screen&quot;</strong></span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
