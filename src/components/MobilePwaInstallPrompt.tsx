/**
 * @fileoverview PWA install prompt for mobile devices.
 * Detects the platform (iOS Safari/Chrome/Edge/Firefox, Android Chrome, generic)
 * and renders browser-specific "Add to Home Screen" instructions. On Android Chrome,
 * intercepts the `beforeinstallprompt` event to offer a native install button.
 * Includes a 10-day snooze and "already installed" persistence via localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { isMobileOrNarrowTouchDevice } from "@/lib/mobile-env";

const STORAGE_INSTALLED = "jobseeker_pwa_installed";
const STORAGE_SNOOZE_UNTIL = "jobseeker_pwa_install_snooze_until";
const SNOOZE_MS = 10 * 24 * 60 * 60 * 1000;

type InstallMode = "ios" | "android-chrome" | "generic";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Checks whether the app is already running in standalone/fullscreen PWA mode. */
function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** iOS third-party browsers use different menus than Safari; UA tokens are reliable enough for copy. */
function getIosBrowserKind(): "safari" | "chrome" | "edge" | "firefox" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/CriOS/i.test(ua)) return "chrome";
  if (/EdgiOS/i.test(ua)) return "edge";
  if (/FxiOS/i.test(ua)) return "firefox";
  if (/OPiOS/i.test(ua)) return "other";
  if (/Safari/i.test(ua) && !/CriOS|EdgiOS|FxiOS|OPiOS/i.test(ua)) return "safari";
  return "other";
}

/** Renders browser-specific iOS "Add to Home Screen" instructions based on detected UA. */
function IosInstallSteps() {
  const kind = getIosBrowserKind();

  if (kind === "chrome" || kind === "edge") {
    const label = kind === "edge" ? "Edge" : "Chrome";
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-foreground/90">
          On iPhone, <span className="font-medium">{label}</span> does not offer a single “Install” button like the App
          Store. Add this site from the menu below (same as other websites you pin to your Home Screen).
        </p>
        <ol className="list-decimal space-y-2.5 pl-5 marker:font-semibold marker:text-foreground">
          <li className="pl-1">
            Tap <span className="font-medium text-foreground">⋯</span> (three dots) in the{" "}
            <span className="font-medium text-foreground">bottom toolbar</span> of {label}.
          </li>
          <li className="pl-1">
            Tap <span className="font-medium text-foreground">Add to Home Screen</span> if it appears here. If not,
            tap <span className="font-medium text-foreground">Share…</span>, then choose{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span> in the share sheet (scroll if
            needed).
          </li>
          <li className="pl-1">
            Tap <span className="font-medium text-foreground">Add</span> to confirm.
          </li>
        </ol>
        <p className="text-xs leading-relaxed">
          Don’t see it? Update {label} from the App Store, or open this page in{" "}
          <span className="font-medium text-foreground">Safari</span> and use{" "}
          <span className="font-medium text-foreground">Share → Add to Home Screen</span>.
        </p>
      </div>
    );
  }

  if (kind === "firefox") {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <ol className="list-decimal space-y-2.5 pl-5 marker:font-semibold marker:text-foreground">
          <li className="pl-1">
            Tap the <span className="font-medium text-foreground">menu</span> (three lines) in Firefox.
          </li>
          <li className="pl-1">
            Tap <span className="font-medium text-foreground">Share</span>, then{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>, then{" "}
            <span className="font-medium text-foreground">Add</span>.
          </li>
        </ol>
      </div>
    );
  }

  if (kind === "safari") {
    return (
      <ol className="list-decimal space-y-2.5 pl-5 text-sm marker:font-semibold marker:text-foreground">
        <li className="pl-1">
          Tap the{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Share
            <Share2 className="inline h-3.5 w-3.5" aria-hidden />
          </span>{" "}
          button (square with arrow) in Safari’s toolbar — bottom on iPhone, top on iPad.
        </li>
        <li className="pl-1">
          Scroll the sheet and tap <span className="font-medium text-foreground">Add to Home Screen</span>, then{" "}
          <span className="font-medium text-foreground">Add</span>.
        </li>
      </ol>
    );
  }

  return (
    <ol className="list-decimal space-y-2.5 pl-5 text-sm marker:font-semibold marker:text-foreground">
      <li className="pl-1">
        Open your browser’s <span className="font-medium text-foreground">Share</span> or{" "}
        <span className="font-medium text-foreground">⋯</span> menu.
      </li>
      <li className="pl-1">
        Look for <span className="font-medium text-foreground">Add to Home Screen</span> and confirm with{" "}
        <span className="font-medium text-foreground">Add</span>.
      </li>
    </ol>
  );
}

/**
 * Bottom-sheet install prompt shown on mobile devices.
 * Skipped on admin pages, when already installed, when snoozed, or on desktop.
 * Locks body scroll while open and dismisses on Escape.
 */
export function MobilePwaInstallPrompt() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<InstallMode>("generic");
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [mobileLike, setMobileLike] = useState(false);

  useEffect(() => {
    const check = () => setMobileLike(isMobileOrNarrowTouchDevice());
    check();
    const mq = window.matchMedia("(max-width: 900px)");
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (location.pathname.startsWith("/admin")) return;
    if (localStorage.getItem(STORAGE_INSTALLED) === "1") return;
    const snoozeUntil = Number(localStorage.getItem(STORAGE_SNOOZE_UNTIL) || 0);
    if (Number.isFinite(snoozeUntil) && snoozeUntil > Date.now()) return;
    if (isStandaloneDisplay()) return;
    if (!mobileLike) return;

    let cancelled = false;
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    let androidFallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let chromeOpenTimer: ReturnType<typeof setTimeout> | undefined;

    const tryOpen = () => {
      if (!cancelled) setOpen(true);
    };

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (cancelled) return;
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanPromptInstall(true);
      setMode("android-chrome");
      if (iosTimer) clearTimeout(iosTimer);
      if (androidFallbackTimer) clearTimeout(androidFallbackTimer);
      if (chromeOpenTimer) clearTimeout(chromeOpenTimer);
      chromeOpenTimer = window.setTimeout(tryOpen, 400);
    };

    const onAppInstalled = () => {
      localStorage.setItem(STORAGE_INSTALLED, "1");
      setCanPromptInstall(false);
      deferredRef.current = null;
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    if (isIos()) {
      setMode("ios");
      iosTimer = window.setTimeout(tryOpen, 1800);
    } else {
      setMode("generic");
      androidFallbackTimer = window.setTimeout(() => {
        if (cancelled || deferredRef.current) return;
        tryOpen();
      }, 4000);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
      if (androidFallbackTimer) clearTimeout(androidFallbackTimer);
      if (chromeOpenTimer) clearTimeout(chromeOpenTimer);
    };
  }, [location.pathname, mobileLike]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_SNOOZE_UNTIL, String(Date.now() + SNOOZE_MS));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, handleDismiss]);

  const handleInstallTap = async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      deferredRef.current = null;
      setCanPromptInstall(false);
      if (choice.outcome === "accepted") {
        localStorage.setItem(STORAGE_INSTALLED, "1");
        setOpen(false);
      }
    } catch {
      deferredRef.current = null;
      setCanPromptInstall(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close install prompt"
        onClick={handleDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        className="absolute bottom-0 left-0 right-0 z-10 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background px-5 pt-4 shadow-2xl sm:px-6"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-primary">
            <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
            <h2 id="pwa-install-title" className="text-base font-semibold sm:text-lg">
              Install JobSeeker app
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={handleDismiss}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <p className="text-left text-sm leading-relaxed text-muted-foreground">
          {mode === "ios" && (
            <>
              {getIosBrowserKind() === "safari"
                ? "Add JobSeeker to your Home Screen for an app-like icon and full-screen experience."
                : "iOS doesn’t offer a store-style Install button for websites in Chrome and other browsers — use Add to Home Screen from the steps below."}
            </>
          )}
          {mode === "android-chrome" && (
            <>Install JobSeeker on your device. It opens full screen and works offline where supported.</>
          )}
          {mode === "generic" && (
            <>
              Add JobSeeker to your home screen from your browser menu for faster access and a cleaner
              full-screen experience.
            </>
          )}
        </p>

        <div className="mt-4">
          {mode === "ios" && <IosInstallSteps />}

          {mode === "generic" && (
            <ol className="list-decimal space-y-2 pl-5 marker:font-medium marker:text-foreground">
              <li className="pl-1">Open your browser menu (often ⋮ or ⋯ at the top or bottom).</li>
              <li className="pl-1">
                Choose <span className="font-medium text-foreground">Install app</span>,{" "}
                <span className="font-medium text-foreground">Add to Home screen</span>, or similar.
              </li>
            </ol>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {mode === "android-chrome" && canPromptInstall && (
            <Button type="button" className="w-full gap-2 font-semibold" onClick={handleInstallTap}>
              <Download className="h-4 w-4" aria-hidden />
              Install app
            </Button>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
