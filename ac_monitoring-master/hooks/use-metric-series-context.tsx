"use client";

import * as React from "react";

import type { SensorReading } from "@/types/sensor";

/**
 * `MetricSeriesContext`
 *
 * Stores a bounded, oldest-first series per metric, sourced from the
 * realtime hook. Why a separate context (not just the hook)?
 *  - One rolling buffer per metric is shared by every chart on the
 *    Monitoring page so swapping window selectors doesn't refetch.
 *  - Decouples chart-specific serialization (`{ t, value }` shape) from
 *    the raw sensor shape, keeping the realtime hook pure.
 *
 * Stability:
 *  - `push` and `reset` are exposed as refs (`pushRef.current(…)`) so
 *    consumers can read them inside effects WITHOUT putting the function
 *    itself in the dep array. Without this, every state update recreates
 *    `push`, the bridge's effect re-fires, and you get an infinite
 *    render loop.
 *  - The `push`/`reset` callbacks themselves are wrapped in
 *    `useCallback` with an empty dep array so they're also stable when
 *    accessed via the ref.
 */

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
  /** Always-stable handle to the push function. Call as `pushRef.current(r)`. */
  pushRef: React.MutableRefObject<(reading: SensorReading) => void>;
  /** Always-stable handle to the reset function. */
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

  // Latest cap, readable from inside the stable `push` callback.
  const capRef = React.useRef(cap);
  React.useEffect(() => {
    capRef.current = cap;
  }, [cap]);

  const initialized = React.useRef(false);
  
  React.useEffect(() => {
    if (initialized.current) return;
    
    import("@/services/firebase").then((mod) => {
      if (!mod.isFirebaseConfigured()) return;
      const { getFirebaseDatabase, FIREBASE_PATHS } = mod;
      import("firebase/database").then((dbMod) => {
        const { get, query, ref, orderByKey, limitToLast } = dbMod;
        const db = getFirebaseDatabase();
        const historyRef = ref(db, FIREBASE_PATHS.history);
        
        get(query(historyRef, orderByKey(), limitToLast(5000))).then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const arr = Object.values(data) as any[];
            const typedArr: SensorReading[] = arr.map((item) => ({ ...item, timestamp: item.timestamp ?? Date.now() }));
            typedArr.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
            
            setSeries((prev) => {
              const next: MetricSeriesState = { ...EMPTY };
              typedArr.forEach(r => {
                const t = r.timestamp;
                if(!t) return;
                if(r.indoor_temp !== undefined) next.indoor_temp.push({ t, value: r.indoor_temp });
                if(r.outdoor_temp !== undefined) next.outdoor_temp.push({ t, value: r.outdoor_temp });
                if(r.supply_temp !== undefined) next.supply_temp.push({ t, value: r.supply_temp });
                if(r.voltage !== undefined) next.voltage.push({ t, value: r.voltage });
                if(r.current !== undefined) next.current.push({ t, value: r.current });
                if(r.power !== undefined) next.power.push({ t, value: r.power });
                if(r.energy !== undefined) next.energy.push({ t, value: r.energy });
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
                power_factor: prev.power_factor
              };
            });
            initialized.current = true;
          }
        }).catch(() => {});
      });
    });
  }, []);

  // Stable callback — empty deps, reads cap through capRef.
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

  // Wrap stable callbacks in refs so the context VALUE identity doesn't
  // change when `series` changes. The `value` of `pushRef.current` is
  // always the same function reference; only `series` updates.
  const pushRef = React.useRef(push);
  const resetRef = React.useRef(reset);
  React.useEffect(() => {
    pushRef.current = push;
    resetRef.current = reset;
  }, [push, reset]);

  // `value` re-creates only when `series` changes — that's the only thing
  // consumers need to re-render on.
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

/**
 * `useWindowedSeries` — convenience selector that returns the subset of a
 * series whose timestamps fall inside the requested window.
 */
export function useWindowedSeries(
  series: SeriesPoint[],
  windowMs: number | "all",
): SeriesPoint[] {
  return React.useMemo(() => {
    if (windowMs === "all" || series.length === 0) return series;
    const cutoff = Date.now() - windowMs;
    const idx = series.findIndex((p) => p.t >= cutoff);
    if (idx <= 0) return series;
    return series.slice(idx);
  }, [series, windowMs]);
}

function append(
  arr: SeriesPoint[],
  value: number,
  t: number,
  cap: number,
): SeriesPoint[] {
  if (typeof value !== "number" || Number.isNaN(value)) return arr;

  // Prevent duplicate timestamps which can cause chart key errors.
  if (arr.length > 0 && arr[arr.length - 1].t === t) {
    return arr;
  }

  const next = arr.length >= cap ? arr.slice(1) : arr.slice();
  next.push({ t, value });
  return next;
}

function mergeAndSort(arr1: SeriesPoint[], arr2: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<number, number>();
  arr1.forEach(p => map.set(p.t, p.value));
  arr2.forEach(p => map.set(p.t, p.value));
  return Array.from(map.entries())
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => a.t - b.t);
}