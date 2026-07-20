"use client";

import * as React from "react";

import type { SensorMetric, SensorReading, Severity } from "@/types/sensor";
import { classifyMetric } from "@/lib/thresholds";

/**
 * `useDeriveAlerts`
 *
 * Looks at the latest reading and produces a small list of "trip" alerts.
 * Each alert is anchored to a single metric crossing into warning/critical.
 *
 * Dedup behavior:
 *  - We keep a ref of the last severity per metric.
 *  - When the severity worsens (healthy → warning → critical), or recovers
 *    back to healthy, we emit ONE alert. Holding at the same level emits
 *    nothing — sustained trips don't spam the user.
 *
 * The alerts array is the source of truth for both the dashboard banner
 * and the top-nav notification popover.
 */

export interface AlertItem {
  id: string; // stable id = `${metric}-${enteredAt}`
  metric: SensorMetric;
  severity: Exclude<Severity, "healthy">;
  value: number;
  /** When the trip began (first reading in this severity bucket). */
  enteredAt: number;
  message: string;
}

const METRIC_LABEL: Record<SensorMetric, string> = {
  indoor_temp: "Room temperature",
  outdoor_temp: "Outdoor temperature",
  supply_temp: "Supply temperature",
  setpoint: "Setpoint",
  humidity: "Humidity",
  voltage: "Voltage",
  current: "Current",
  power: "Power",
  power_factor: "Power factor",
  energy: "Energy",
};

const SEVERITY_VERB: Record<Exclude<Severity, "healthy">, string> = {
  warning: "outside healthy range",
  critical: "tripped critical threshold",
};

export function useDeriveAlerts(
  reading: SensorReading | null,
  maxKeep = 20,
): AlertItem[] {
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const lastSeverityRef = React.useRef<
    Partial<Record<SensorMetric, Severity>>
  >({});

  React.useEffect(() => {
    if (!reading) return;
    const next: AlertItem[] = [];
    const last = { ...lastSeverityRef.current };

    (Object.keys(METRIC_LABEL) as SensorMetric[]).forEach((metric) => {
      const value = reading[metric];
      const severity = classifyMetric(metric, value);
      const previous = last[metric] ?? "healthy";

      if (severity === previous) return;

      if (severity !== "healthy") {
        next.push({
          id: `${metric}-${reading.timestamp}`,
          metric,
          severity,
          value,
          enteredAt: reading.timestamp,
          message: `${METRIC_LABEL[metric]} ${SEVERITY_VERB[severity]} (${value.toFixed(2)})`,
        });
      } else {
        // Recovery — surface as an info-style entry so the user knows it cleared.
        next.push({
          id: `${metric}-recover-${reading.timestamp}`,
          metric,
          severity: "warning",
          value,
          enteredAt: reading.timestamp,
          message: `${METRIC_LABEL[metric]} back to healthy (${value.toFixed(2)})`,
        });
      }
      last[metric] = severity;
    });

    lastSeverityRef.current = last;
    if (next.length === 0) return;
    setAlerts((prev) => [...next.reverse(), ...prev].slice(0, maxKeep));
  }, [reading, maxKeep]);

  return alerts;
}