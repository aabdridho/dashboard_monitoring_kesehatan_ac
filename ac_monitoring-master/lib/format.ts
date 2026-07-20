import {
  METRIC_PRECISION,
  METRIC_UNITS,
  type SensorMetric,
} from "@/types/sensor";

/**
 * Format a numeric metric for display.
 *
 *  - Rounds to the metric's configured precision.
 *  - Returns `"--"` for null / undefined / NaN (cards show a clean
 *    "waiting for first reading" state without bouncing).
 *  - Keeps the unit string separate so cards can style the unit
 *    differently (e.g. smaller / muted color).
 */
export function formatMetric(
  value: number | undefined | null,
  metric: SensorMetric,
): { text: string; unit: string; decimal: number } {
  const unit = METRIC_UNITS[metric];
  const decimal = METRIC_PRECISION[metric];
  if (value === undefined || value === null || Number.isNaN(value)) {
    return { text: "--", unit, decimal };
  }
  return {
    text: value.toFixed(decimal),
    unit,
    decimal,
  };
}

/**
 * Format a relative time string for "X minutes ago" captions.
 * Kept intentionally small; we use it in the device-info and history
 * tables only.
 */
export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "—";
  const delta = Date.now() - timestamp;
  if (delta < 5_000) return "just now";
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`;
  return `${Math.round(delta / 86_400_000)}d ago`;
}
