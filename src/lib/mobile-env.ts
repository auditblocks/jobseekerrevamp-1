/** True when likely a phone/tablet or narrow touch viewport (covers “desktop UA” on mobile). */
export function isMobileOrNarrowTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  if (window.matchMedia("(max-width: 480px)").matches) return true;
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return narrow && coarse;
}
