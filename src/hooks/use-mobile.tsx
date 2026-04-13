/**
 * @file use-mobile.tsx
 * Reactive viewport-width hook for responsive layout decisions.
 */

import * as React from "react";

/** Breakpoint (px) below which the viewport is considered "mobile". */
const MOBILE_BREAKPOINT = 768;

/**
 * Returns `true` when the viewport width is below {@link MOBILE_BREAKPOINT}.
 * Re-evaluates on window resize via a `matchMedia` listener.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
