"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * `useIsMobile` — returns true while the viewport is below `md` (768px).
 *
 * Used to flip the sidebar between the persistent desktop variant and the
 * Radix Sheet drawer on mobile. Listens to `matchMedia` so it stays in
 * sync with system zoom / device rotation.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Set immediately on mount, then subscribe.
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile ?? false;
}
