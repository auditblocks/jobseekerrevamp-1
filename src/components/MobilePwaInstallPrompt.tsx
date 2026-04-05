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
            <>Add this site to your Home Screen for quick access and an app-like experience.</>
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

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          {mode === "ios" && (
            <ol className="list-decimal space-y-2 pl-5 marker:font-medium marker:text-foreground">
              <li className="pl-1">
                Tap the{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  Share
                  <Share2 className="inline h-3.5 w-3.5" aria-hidden />
                </span>{" "}
                button (Safari toolbar or Chrome menu).
              </li>
              <li className="pl-1">
                Choose{" "}
                <span className="font-medium text-foreground">Add to Home Screen</span>, then{" "}
                <span className="font-medium text-foreground">Add</span>.
              </li>
            </ol>
          )}

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
