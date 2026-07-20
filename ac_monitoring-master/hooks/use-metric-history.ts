"use client";

import * as React from "react";

import type { SensorReading } from "@/types/sensor";
import { useMetricSeries } from "@/hooks/use-metric-series-context";

/**
 * `useMetricHistory` — returns a small, fixed-size array of recent
 * values per metric, used by `MetricCard` for the "vs last reading"
 * trend chip.
 *
 * Backed by {@link useMetricSeries} so we keep ONE rolling buffer across
 * the dashboard and charts. We just slice the last `cap` points off the
 * canonical series and project to numbers.
 */
export interface MetricHistoryEntryMap {
  indoor_temp: number[];
  outdoor_temp: number[];
  supply_temp: number[];
  setpoint: number[];
  voltage: number[];
  current: number[];
  power: number[];
  power_factor: number[];
  energy: number[];
}

const EMPTY: MetricHistoryEntryMap = {
  indoor_temp: [],
  outdoor_temp: [],
  supply_temp: [],
  setpoint: [],
  voltage: [],
  current: [],
  power: [],
  power_factor: [],
  energy: [],
};

export function useMetricHistory(
  _reading: SensorReading | null,
  cap = 6,
): MetricHistoryEntryMap {
  const series = useMetricSeries();
  return React.useMemo<MetricHistoryEntryMap>(
    () => ({
      indoor_temp: projectTail(series.indoor_temp, cap),
      outdoor_temp: projectTail(series.outdoor_temp, cap),
      supply_temp: projectTail(series.supply_temp, cap),
      setpoint: projectTail(series.setpoint, cap),
      voltage: projectTail(series.voltage, cap),
      current: projectTail(series.current, cap),
      power: projectTail(series.power, cap),
      power_factor: projectTail(series.power_factor, cap),
      energy: projectTail(series.energy, cap),
    }),
    [
      series.indoor_temp,
      series.outdoor_temp,
      series.supply_temp,
      series.setpoint,
      series.voltage,
      series.current,
      series.power,
      series.power_factor,
      series.energy,
      cap,
    ],
  );
}

function projectTail(
  arr: ReadonlyArray<{ value: number }>,
  cap: number,
): number[] {
  if (!arr || arr.length === 0) return [];
  const start = Math.max(0, arr.length - cap);
  return arr.slice(start).map((p) => p.value);
}