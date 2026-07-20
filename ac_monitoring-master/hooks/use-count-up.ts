"use client";

import * as React from "react";

/**
 * `useCountUp` — smoothly animates `value` toward its new value over
 * `duration` ms using `requestAnimationFrame`. Returns the in-flight
 * numeric value to display.
 *
 * Skips the animation when `value` is undefined/null so callers can pass
 * "still loading" states without flickering.
 *
 * Stability:
 *  - Effect deps are `[value]` only. `duration` and the callback options
 *    are read via refs so a fresh `options` object on every render does
 *    NOT restart the animation, and we never re-enter the rAF loop.
 */
export function useCountUp(
  value: number | undefined | null,
  options?: { duration?: number; precision?: number },
): number | undefined {
  const [display, setDisplay] = React.useState<number | undefined>(
    value ?? undefined,
  );

  // Refs hold the "live" values the rAF callback needs.
  const valueRef = React.useRef<number | undefined | null>(value);
  const durationRef = React.useRef<number>(options?.duration ?? 700);
  const prevValueRef = React.useRef<number>(value ?? 0);
  const startRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);

  // Keep refs in sync with the latest values outside the rAF closure.
  React.useEffect(() => {
    durationRef.current = options?.duration ?? 700;
  }, [options?.duration]);

  React.useEffect(() => {
    // Bail out cleanly when there's nothing to animate.
    if (value === undefined || value === null) {
      setDisplay(undefined);
      return;
    }

    // Cancel any in-flight animation from a previous value.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    valueRef.current = value;
    const from = prevValueRef.current;
    startRef.current = null;

    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const duration = durationRef.current;
      const target = valueRef.current;
      if (target === undefined || target === null) return;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (target - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevValueRef.current = target;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value]);

  return display;
}