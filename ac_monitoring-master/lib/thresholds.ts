import type { SensorMetric, Severity } from "@/types/sensor";

/**
 * Healthy / warning / critical ranges per metric.
 *
 * Bounds are mirrored in the ESP32 firmware; keep both in sync when
 * adjusting. Order of fields in `range` is [warn, critical].
 *
 *   warning  ≤ value < critical          → "warning"
 *   critical ≤ value ≤ criticalUpper     → "critical"
 *   value < warningLower                 → "warning"
 *   etc.
 */

interface ThresholdBand {
  /** Below this is "warning" / "critical". */
  warningLower?: number;
  warningUpper?: number;
  /** Outside this is "critical". */
  criticalLower?: number;
  criticalUpper?: number;
}

export const THRESHOLDS: Record<SensorMetric, ThresholdBand> = {
  // Indoor room temperature — typical comfort range is 20-26 °C.
  indoor_temp: {
    warningLower: 18,
    warningUpper: 27,
    criticalLower: 16,
    criticalUpper: 30,
  },
  // Outdoor can be wider.
  outdoor_temp: {
    warningLower: 10,
    warningUpper: 40,
    criticalLower: 5,
    criticalUpper: 45,
  },
  // Supply (evaporator) temperature.
  supply_temp: {
    warningLower: 10,
    warningUpper: 28,
    criticalLower: 5,
    criticalUpper: 32,
  },
  // Setpoint — no thresholds by default.
  setpoint: {},
  // Humidity comfort: 40-60%.
  humidity: {
    warningLower: 35,
    warningUpper: 65,
    criticalLower: 25,
    criticalUpper: 75,
  },
  // Mains voltage nominal 220V; allow ±10V.
  voltage: {
    warningLower: 210,
    warningUpper: 230,
    criticalLower: 200,
    criticalUpper: 240,
  },
  // Current trip thresholds for a typical 16A AC.
  current: {
    warningUpper: 12,
    criticalUpper: 14,
  },
  // Power warning for sustained draw.
  power: {
    warningUpper: 2500,
    criticalUpper: 3000,
  },
  // Power factor — no thresholds by default.
  power_factor: {},
  // Energy has no upper trip — it's cumulative.
  energy: {},
};

/**
 * Classify a single metric value into a severity.
 * Returns "healthy" when no rule fires.
 */
export function classifyMetric(
  metric: SensorMetric,
  value: number | undefined | null,
): Severity {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "healthy";
  }
  const band = THRESHOLDS[metric];

  // Defensive: if no thresholds defined for this metric, treat as healthy.
  if (!band) return "healthy";

  // Critical — strictly outside the bigger envelope.
  if (band.criticalLower !== undefined && value < band.criticalLower)
    return "critical";
  if (band.criticalUpper !== undefined && value > band.criticalUpper)
    return "critical";

  // Warning — between healthy and critical.
  if (band.warningLower !== undefined && value < band.warningLower)
    return "warning";
  if (band.warningUpper !== undefined && value > band.warningUpper)
    return "warning";

  return "healthy";
}
