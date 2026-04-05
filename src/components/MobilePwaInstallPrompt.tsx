import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download, Share2, Smartphone } from "lucide-react";

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

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (location.pathname.startsWith("/admin")) return;
    if (localStorage.getItem(STORAGE_INSTALLED) === "1") return;
    const snoozeUntil = Number(localStorage.getItem(STORAGE_SNOOZE_UNTIL) || 0);
    if (Number.isFinite(snoozeUntil) && snoozeUntil > Date.now()) return;
    if (isStandaloneDisplay()) return;
    if (!isMobileUserAgent()) return;

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
      chromeOpenTimer = window.setTimeout(tryOpen, 500);
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
      iosTimer = window.setTimeout(tryOpen, 3200);
    } else {
      setMode("generic");
      androidFallbackTimer = window.setTimeout(() => {
        if (cancelled || deferredRef.current) return;
        tryOpen();
      }, 6500);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
      if (androidFallbackTimer) clearTimeout(androidFallbackTimer);
      if (chromeOpenTimer) clearTimeout(chromeOpenTimer);
    };
  }, [location.pathname]);

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

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          localStorage.setItem(STORAGE_SNOOZE_UNTIL, String(Date.now() + SNOOZE_MS));
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="z-[70] rounded-t-2xl border-t border-border/80 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
      >
        <SheetHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-primary">
            <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
            <SheetTitle className="text-base font-semibold sm:text-lg">Install JobSeeker app</SheetTitle>
          </div>
          <SheetDescription className="text-left text-sm leading-relaxed">
            {mode === "ios" && (
              <>
                Add this site to your Home Screen for quick access and an app-like experience.
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
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          {mode === "ios" && (
            <ol className="list-decimal space-y-2 pl-5 marker:font-medium marker:text-foreground">
              <li className="pl-1">
                Tap the{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  Share
                  <Share2 className="inline h-3.5 w-3.5" aria-hidden />
                </span>{" "}
                button in Safari (center or bottom of the toolbar).
              </li>
              <li className="pl-1">
                Scroll and tap{" "}
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

        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
          {mode === "android-chrome" && canPromptInstall && (
            <Button type="button" className="w-full gap-2 font-semibold" onClick={handleInstallTap}>
              <Download className="h-4 w-4" aria-hidden />
              Install app
            </Button>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
