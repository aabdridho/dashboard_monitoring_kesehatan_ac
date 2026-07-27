"use client";

import * as React from "react";
import { useFirebaseHistory } from "@/hooks/use-firebase-history";
import type { SensorReading } from "@/types/sensor";

export interface SeriesPoint {
  t: number; // epoch ms
  value: number;
}

export interface MetricSeriesState {
  indoor_temp: SeriesPoint[];
  outdoor_temp: SeriesPoint[];
  supply_temp: SeriesPoint[];
  setpoint: SeriesPoint[];
  humidity: SeriesPoint[];
  voltage: SeriesPoint[];
  current: SeriesPoint[];
  power: SeriesPoint[];
  power_factor: SeriesPoint[];
  energy: SeriesPoint[];
}

const EMPTY: MetricSeriesState = {
  indoor_temp: [],
  outdoor_temp: [],
  supply_temp: [],
  setpoint: [],
  humidity: [],
  voltage: [],
  current: [],
  power: [],
  power_factor: [],
  energy: [],
};

const DEFAULT_CAP = 10000;

interface MetricSeriesContextValue extends MetricSeriesState {
  pushRef: React.MutableRefObject<(reading: SensorReading) => void>;
  resetRef: React.MutableRefObject<() => void>;
}

const MetricSeriesContext = React.createContext<MetricSeriesContextValue | null>(
  null,
);

export function MetricSeriesProvider({
  children,
  cap = DEFAULT_CAP,
}: {
  children: React.ReactNode;
  cap?: number;
}) {
  const [series, setSeries] = React.useState<MetricSeriesState>(EMPTY);

  const capRef = React.useRef(cap);
  React.useEffect(() => {
    capRef.current = cap;
  }, [cap]);

  const { history: initialHistory, loading: historyLoading } = useFirebaseHistory(2000);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (!historyLoading && !initialized.current && initialHistory.length > 0) {
      initialized.current = true;
      setSeries((prev) => {
        const next: MetricSeriesState = { ...EMPTY };
        initialHistory.forEach((r) => {
          const t = r.timestamp;
          if (!t) return;
          if (r.indoor_temp !== undefined) next.indoor_temp.push({ t, value: r.indoor_temp });
          if (r.outdoor_temp !== undefined) next.outdoor_temp.push({ t, value: r.outdoor_temp });
          if (r.supply_temp !== undefined) next.supply_temp.push({ t, value: r.supply_temp });
          if (r.voltage !== undefined) next.voltage.push({ t, value: r.voltage });
          if (r.current !== undefined) next.current.push({ t, value: r.current });
          if (r.power !== undefined) next.power.push({ t, value: r.power });
          if (r.energy !== undefined) next.energy.push({ t, value: r.energy });
        });

        return {
          indoor_temp: mergeAndSort(next.indoor_temp, prev.indoor_temp),
          outdoor_temp: mergeAndSort(next.outdoor_temp, prev.outdoor_temp),
          supply_temp: mergeAndSort(next.supply_temp, prev.supply_temp),
          voltage: mergeAndSort(next.voltage, prev.voltage),
          current: mergeAndSort(next.current, prev.current),
          power: mergeAndSort(next.power, prev.power),
          energy: mergeAndSort(next.energy, prev.energy),
          setpoint: prev.setpoint,
          humidity: prev.humidity,
          power_factor: prev.power_factor,
        };
      });
    }
  }, [historyLoading, initialHistory]);

  const push = React.useCallback((reading: SensorReading) => {
    const limit = capRef.current;
    setSeries((prev) => ({
      indoor_temp: append(prev.indoor_temp, reading.indoor_temp, reading.timestamp, limit),
      outdoor_temp: append(prev.outdoor_temp, reading.outdoor_temp, reading.timestamp, limit),
      supply_temp: append(prev.supply_temp, reading.supply_temp, reading.timestamp, limit),
      setpoint: append(prev.setpoint, reading.setpoint, reading.timestamp, limit),
      humidity: append(prev.humidity, reading.humidity, reading.timestamp, limit),
      voltage: append(prev.voltage, reading.voltage, reading.timestamp, limit),
      current: append(prev.current, reading.current, reading.timestamp, limit),
      power: append(prev.power, reading.power, reading.timestamp, limit),
      power_factor: append(prev.power_factor, reading.power_factor, reading.timestamp, limit),
      energy: append(prev.energy, reading.energy, reading.timestamp, limit),
    }));
  }, []);

  const reset = React.useCallback(() => {
    setSeries(EMPTY);
  }, []);

  const pushRef = React.useRef(push);
  const resetRef = React.useRef(reset);
  React.useEffect(() => {
    pushRef.current = push;
    resetRef.current = reset;
  }, [push, reset]);

  const value = React.useMemo<MetricSeriesContextValue>(
    () => ({ ...series, pushRef, resetRef }),
    [series, pushRef, resetRef],
  );

  return (
    <MetricSeriesContext.Provider value={value}>
      {children}
    </MetricSeriesContext.Provider>
  );
}

export function useMetricSeries(): MetricSeriesContextValue {
  const ctx = React.useContext(MetricSeriesContext);
  if (!ctx) {
    throw new Error(
      "useMetricSeries must be used inside <MetricSeriesProvider>.",
    );
  }
  return ctx;
}

export function useWindowedSeries(
  series: SeriesPoint[],
  windowMs: number | "all",
): SeriesPoint[] {
  return React.useMemo(() => {
    if (!series || series.length === 0) return [];
    const valid = series.filter((p) => typeof p.value === "number" && !isNaN(p.value) && p.value > 0);
    if (valid.length === 0) return [];
    if (windowMs === "all") return valid;

    const maxT = valid[valid.length - 1]?.t ?? 0;
    const cutoff = maxT - windowMs;
    const idx = valid.findIndex((p) => p.t >= cutoff);
    if (idx <= 0) return valid;
    return valid.slice(idx);
  }, [series, windowMs]);
}

function append(
  arr: SeriesPoint[],
  value: number,
  t: number,
  cap: number,
): SeriesPoint[] {
  if (typeof value !== "number" || Number.isNaN(value)) return arr;

  if (arr.length > 0 && arr[arr.length - 1].t === t) {
    return arr;
  }

  const next = arr.length >= cap ? arr.slice(1) : arr.slice();
  next.push({ t, value });
  return next;
}

function mergeAndSort(arr1: SeriesPoint[], arr2: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<number, number>();
  arr1.forEach((p) => map.set(p.t, p.value));
  arr2.forEach((p) => map.set(p.t, p.value));
  return Array.from(map.entries())
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => a.t - b.t);
}