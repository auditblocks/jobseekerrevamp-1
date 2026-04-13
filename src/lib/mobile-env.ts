/**
 * @file mobile-env.ts
 * Heuristic detection of mobile / narrow-touch environments.
 * Used to conditionally disable features that only make sense on desktop
 * (e.g., keyboard shortcuts, hover-only interactions).
 */

/**
 * Returns `true` when the device is likely a phone, tablet, or narrow touch viewport.
 * Combines UA sniffing, touch-point checks, and media queries to cover edge cases
 * like iPadOS reporting a desktop UA.
 */
export function isMobileOrNarrowTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  // iPadOS reports "MacIntel" but exposes multiple touch points
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  if (window.matchMedia("(max-width: 480px)").matches) return true;
  // Combination of narrow viewport + coarse pointer strongly implies a touch device
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return narrow && coarse;
}
