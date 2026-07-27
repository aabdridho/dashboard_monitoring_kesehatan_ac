"use client";

import * as React from "react";
import { Activity, Bolt, Droplets, Flame, Power } from "lucide-react";
import { motion } from "framer-motion";

import { AreaChart } from "@/components/charts/area-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import {
  useMetricSeries,
  useWindowedSeries,
  type SeriesPoint,
} from "@/hooks/use-metric-series-context";
import { useRealtimeContext } from "@/hooks/use-realtime-context";
import type { SensorMetric } from "@/types/sensor";

/**
 * Monitoring view — five live Recharts area charts (temperature, humidity,
 * voltage, current, power) + a window selector that lets the user pick
 * how far back to look.
 *
 * Energy is intentionally left out — it's cumulative and not useful as a
 * line chart. The dashboard already surfaces it as a single metric card
 * (we re-render the same card stack at the top of this page so the
 * glance-and-go metric is reachable from here too).
 */

type WindowMs = 300_000 | 1_800_000 | 3_600_000 | "all";

const WINDOWS: ReadonlyArray<{ label: string; value: WindowMs }> = [
  { label: "5m", value: 300_000 },
  { label: "30m", value: 1_800_000 },
  { label: "1h", value: 3_600_000 },
  { label: "All", value: "all" },
];

export function MonitoringView() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Realtime Monitoring
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground md:text-base">
          Live readings from the AC unit, rolling windows over the most
          recent session.
        </p>
      </header>

      <LiveSnapshot />
      <WindowedCharts />
    </div>
  );
}

function LiveSnapshot() {
  const { reading } = useRealtimeContext();
  const series = useMetricSeries();

  const v = (k: SensorMetric): number | null => reading?.[k] ?? null;

  // The metric cards want short tails; use the very last entries (cap=6)
  // through our existing hook.
  const tail = React.useMemo(
    () => ({
      indoor_temp: projectTail(series.indoor_temp, 6),
      outdoor_temp: projectTail(series.outdoor_temp, 6),
      supply_temp: projectTail(series.supply_temp, 6),
      voltage: projectTail(series.voltage, 6),
      current: projectTail(series.current, 6),
      power: projectTail(series.power, 6),
      energy: projectTail(series.energy, 6),
    }),
    [series],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="Indoor Temp"
        metric="indoor_temp"
        value={v("indoor_temp")}
        icon={Flame}
        history={tail.indoor_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Outdoor Temp"
        metric="outdoor_temp"
        value={v("outdoor_temp")}
        icon={Flame}
        history={tail.outdoor_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Supply Temp"
        metric="supply_temp"
        value={v("supply_temp")}
        icon={Flame}
        history={tail.supply_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Voltage"
        metric="voltage"
        value={v("voltage")}
        icon={Bolt}
        history={tail.voltage}
        trendTone="warning"
      />
      <MetricCard
        label="Current"
        metric="current"
        value={v("current")}
        icon={Activity}
        history={tail.current}
        trendTone="warning"
      />
      <MetricCard
        label="Power"
        metric="power"
        value={v("power")}
        icon={Power}
        history={tail.power}
        trendTone="warning"
      />
    </div>
  );
}

function WindowedCharts() {
  const [windowMs, setWindowMs] = React.useState<WindowMs>(300_000);
  const series = useMetricSeries();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Live charts</h2>
          <p className="text-xs text-muted-foreground">
            Update rate matches the ESP32 reading interval.
          </p>
        </div>
        <WindowSelector value={windowMs} onChange={setWindowMs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Indoor Temperature"
          description="Room temperature (°C)"
          tone="primary"
          yFormatter={(v) => v.toFixed(1)}
          yDomain={[16, 32]}
          keyName="indoor_temp"
          windowMs={windowMs}
        />
        <ChartCard
          title="Outdoor Temperature"
          description="Outdoor temperature (°C)"
          tone="info"
          yFormatter={(v) => v.toFixed(1)}
          yDomain={[20, 45]}
          keyName="outdoor_temp"
          windowMs={windowMs}
        />
        <ChartCard
          title="Supply Temperature"
          description="AC supply temperature (°C)"
          tone="accent"
          yFormatter={(v) => v.toFixed(1)}
          yDomain={[10, 25]}
          keyName="supply_temp"
          windowMs={windowMs}
        />
        <ChartCard
          title="Voltage"
          description="Mains voltage (V)"
          tone="accent"
          yFormatter={(v) => v.toFixed(0)}
          yDomain={[200, 240]}
          keyName="voltage"
          windowMs={windowMs}
        />
        <ChartCard
          title="Power"
          description="Instantaneous power (W)"
          tone="accent"
          yFormatter={(v) => v.toFixed(0)}
          yDomain={[0, 1500]}
          keyName="power"
          windowMs={windowMs}
        />
        <ChartCard
          title="Current"
          description="Load current (A)"
          tone="primary"
          yFormatter={(v) => v.toFixed(2)}
          yDomain={[0, 8]}
          keyName="current"
          windowMs={windowMs}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  tone,
  yFormatter,
  yDomain,
  keyName,
  windowMs,
  className,
}: {
  title: string;
  description: string;
  tone: "primary" | "accent" | "info";
  yFormatter: (v: number) => string;
  yDomain: [number, number];
  keyName: SensorMetric;
  windowMs: WindowMs;
  className?: string;
}) {
  const series = useMetricSeries();
  const points = useWindowedSeries(series[keyName], windowMs);

  const data = React.useMemo(
    () => points.map((p: SeriesPoint) => ({ t: p.t, [keyName]: p.value })),
    [points, keyName],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("h-full", className)}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
          <Badge variant="default" className="gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Live
          </Badge>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={data}
            seriesKey={keyName}
            tone={tone}
            yTickFormatter={yFormatter}
            yDomain={yDomain}
            heightClass="h-56"
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function WindowSelector({
  value,
  onChange,
}: {
  value: WindowMs;
  onChange: (value: WindowMs) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted/60 p-1 text-xs">
      {WINDOWS.map((w) => {
        const active = w.value === value;
        return (
          <button
            key={w.label}
            type="button"
            onClick={() => onChange(w.value)}
            className={cn(
              "rounded-lg px-2.5 py-1 transition-colors",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

function projectTail(arr: ReadonlyArray<{ value: number }>, cap: number): number[] {
  if (arr.length === 0) return [];
  const start = Math.max(0, arr.length - cap);
  return arr.slice(start).map((p) => p.value);
}