"use client";

import * as React from "react";
import { Activity, Bolt, Flame, Power } from "lucide-react";
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
  type SeriesPoint,
} from "@/hooks/use-metric-series-context";
import { useRealtimeContext } from "@/hooks/use-realtime-context";
import { useFirebaseHistory } from "@/hooks/use-firebase-history";
import type { SensorMetric, SensorReading } from "@/types/sensor";

/* ------------------------------------------------------------------ */
/*  Time-window types                                                  */
/* ------------------------------------------------------------------ */

type WindowMs = 300_000 | 1_800_000 | 3_600_000 | "all";

const WINDOWS: ReadonlyArray<{ label: string; value: WindowMs }> = [
  { label: "5 mnt", value: 300_000 },
  { label: "30 mnt", value: 1_800_000 },
  { label: "1 jam", value: 3_600_000 },
  { label: "Semua", value: "all" },
];

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

export function MonitoringView() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Monitoring Real-Time
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground md:text-base">
          Grafik pembacaan sensor AC secara langsung dengan pilihan rentang waktu.
        </p>
      </header>

      <LiveSnapshot />
      <WindowedCharts />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live snapshot cards (top row)                                       */
/* ------------------------------------------------------------------ */

function LiveSnapshot() {
  const { reading } = useRealtimeContext();
  const series = useMetricSeries();

  const v = (k: SensorMetric): number | null => reading?.[k] ?? null;

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
        label="Suhu Indoor"
        metric="indoor_temp"
        value={v("indoor_temp")}
        icon={Flame}
        history={tail.indoor_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Suhu Outdoor"
        metric="outdoor_temp"
        value={v("outdoor_temp")}
        icon={Flame}
        history={tail.outdoor_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Suhu Supply AC"
        metric="supply_temp"
        value={v("supply_temp")}
        icon={Flame}
        history={tail.supply_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Tegangan"
        metric="voltage"
        value={v("voltage")}
        icon={Bolt}
        history={tail.voltage}
        trendTone="warning"
      />
      <MetricCard
        label="Arus"
        metric="current"
        value={v("current")}
        icon={Activity}
        history={tail.current}
        trendTone="warning"
      />
      <MetricCard
        label="Daya"
        metric="power"
        value={v("power")}
        icon={Power}
        history={tail.power}
        trendTone="warning"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Windowed charts — pulls data directly from Firebase                */
/* ------------------------------------------------------------------ */

function WindowedCharts() {
  const [windowMs, setWindowMs] = React.useState<WindowMs>(300_000);

  // Fetch a large chunk of history from Firebase.
  // For "All" we want everything; for shorter windows we still fetch
  // plenty so window switching is instant.
  const fetchLimit = windowMs === "all" ? 50000 : 5000;
  const { history, loading } = useFirebaseHistory(fetchLimit);

  // Current time reference — updated every 5 seconds so the cutoff
  // stays fresh without excessive re-renders.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Filter history by the selected time window relative to NOW.
  const filteredHistory = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    if (windowMs === "all") return history;

    const cutoff = now - windowMs;
    return history.filter((r) => r.timestamp >= cutoff);
  }, [history, windowMs, now]);

  // Build per-metric series from the filtered history.
  const chartSeries = React.useMemo(() => {
    const result: Record<string, Array<{ t: number; value: number }>> = {
      indoor_temp: [],
      outdoor_temp: [],
      supply_temp: [],
      voltage: [],
      current: [],
      power: [],
    };

    filteredHistory.forEach((r: SensorReading) => {
      const t = r.timestamp;
      if (!t) return;

      if (r.indoor_temp > 0) result.indoor_temp.push({ t, value: r.indoor_temp });
      if (r.outdoor_temp > 0) result.outdoor_temp.push({ t, value: r.outdoor_temp });
      if (r.supply_temp > 0) result.supply_temp.push({ t, value: r.supply_temp });
      if (r.voltage > 0) result.voltage.push({ t, value: r.voltage });
      if (r.current >= 0) result.current.push({ t, value: r.current });
      if (r.power >= 0) result.power.push({ t, value: r.power });
    });

    return result;
  }, [filteredHistory]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Grafik Real-Time</h2>
          <p className="text-xs text-muted-foreground">
            {windowMs === "all"
              ? "Menampilkan seluruh data dari awal hingga sekarang."
              : `Menampilkan data ${windowMs === 300_000 ? "5 menit" : windowMs === 1_800_000 ? "30 menit" : "1 jam"} terakhir dari sekarang.`}
            {loading && " Memuat data..."}
          </p>
        </div>
        <WindowSelector value={windowMs} onChange={setWindowMs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Suhu Indoor"
          description="Suhu ruangan indoor (°C)"
          tone="primary"
          yFormatter={(v) => v.toFixed(1)}
          yDomain={[16, 32]}
          keyName="indoor_temp"
          data={chartSeries.indoor_temp}
        />
        <ChartCard
          title="Suhu Outdoor"
          description="Suhu lingkungan outdoor (°C)"
          tone="info"
          yFormatter={(v) => v.toFixed(1)}
          yDomain={[20, 45]}
          keyName="outdoor_temp"
          data={chartSeries.outdoor_temp}
        />
        <ChartCard
          title="Suhu Supply AC"
          description="Suhu hembusan udara AC (°C)"
          tone="accent"
          yFormatter={(v) => v.toFixed(1)}
          yDomain={[10, 30]}
          keyName="supply_temp"
          data={chartSeries.supply_temp}
        />
        <ChartCard
          title="Tegangan Listrik"
          description="Tegangan utama (V)"
          tone="accent"
          yFormatter={(v) => v.toFixed(0)}
          yDomain={[200, 240]}
          keyName="voltage"
          data={chartSeries.voltage}
        />
        <ChartCard
          title="Daya Listrik"
          description="Daya aktif (W)"
          tone="accent"
          yFormatter={(v) => v.toFixed(0)}
          yDomain={[0, 1500]}
          keyName="power"
          data={chartSeries.power}
        />
        <ChartCard
          title="Arus Listrik"
          description="Arus beban (A)"
          tone="primary"
          yFormatter={(v) => v.toFixed(2)}
          yDomain={[0, 8]}
          keyName="current"
          data={chartSeries.current}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual chart card                                              */
/* ------------------------------------------------------------------ */

function ChartCard({
  title,
  description,
  tone,
  yFormatter,
  yDomain,
  keyName,
  data,
  className,
}: {
  title: string;
  description: string;
  tone: "primary" | "accent" | "info";
  yFormatter: (v: number) => string;
  yDomain: [number, number];
  keyName: string;
  data: Array<{ t: number; value: number }>;
  className?: string;
}) {
  const chartData = React.useMemo(
    () => data.map((p) => ({ t: p.t, [keyName]: p.value })),
    [data, keyName],
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
            data={chartData}
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

/* ------------------------------------------------------------------ */
/*  Window selector buttons                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function projectTail(arr: ReadonlyArray<{ value: number }>, cap: number): number[] {
  if (arr.length === 0) return [];
  const start = Math.max(0, arr.length - cap);
  return arr.slice(start).map((p) => p.value);
}