"use client";

import * as React from "react";
import {
  Activity,
  Bolt,
  Flame,
  Gauge as GaugeIcon,
  Power,
  Zap,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { useMetricHistory } from "@/hooks/use-metric-history";
import { useRealtimeContext } from "@/hooks/use-realtime-context";
import type {
  DeviceStatus,
  SensorMetric,
} from "@/types/sensor";

const STATUS_TONE: Record<
  DeviceStatus,
  {
    ring: string;
    dot: string;
    label: string;
    badgeVariant: "success" | "warning" | "destructive" | "default";
  }
> = {
  healthy: {
    ring: "ring-[var(--ring-healthy)]",
    dot: "bg-success",
    label: "Healthy",
    badgeVariant: "success",
  },
  warning: {
    ring: "ring-[var(--ring-warning)]",
    dot: "bg-warning",
    label: "Warning",
    badgeVariant: "warning",
  },
  critical: {
    ring: "ring-[var(--ring-critical)]",
    dot: "bg-destructive",
    label: "Kritis",
    badgeVariant: "destructive",
  },
  offline: {
    ring: "ring-border",
    dot: "bg-muted-foreground",
    label: "Offline",
    badgeVariant: "default",
  },
};

export function OverviewGrid() {
  const { reading } = useRealtimeContext();
  const history = useMetricHistory(reading);

  const v = (k: SensorMetric): number | null => reading?.[k] ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <MetricCard
        label="Suhu Indoor"
        metric="indoor_temp"
        value={v("indoor_temp")}
        icon={Flame}
        history={history.indoor_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Suhu Outdoor"
        metric="outdoor_temp"
        value={v("outdoor_temp")}
        icon={Flame}
        history={history.outdoor_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Suhu Supply AC"
        metric="supply_temp"
        value={v("supply_temp")}
        icon={Flame}
        history={history.supply_temp}
        trendTone="warning"
      />
      <MetricCard
        label="Tegangan Listrik"
        metric="voltage"
        value={v("voltage")}
        icon={Bolt}
        history={history.voltage}
        trendTone="warning"
      />
      <MetricCard
        label="Arus Listrik"
        metric="current"
        value={v("current")}
        icon={Activity}
        history={history.current}
        trendTone="warning"
      />
      <MetricCard
        label="Daya Listrik"
        metric="power"
        value={v("power")}
        icon={Power}
        history={history.power}
        trendTone="warning"
      />
      <MetricCard
        label="Konsumsi Energi"
        metric="energy"
        value={v("energy")}
        icon={Zap}
        history={history.energy}
        trendTone="muted"
      />
      <AcStatusCard />
    </div>
  );
}

function AcStatusCard() {
  const { reading, status } = useRealtimeContext();
  const tone = STATUS_TONE[status];

  return (
    <Card className={cn("ring-1 ring-inset", tone.ring)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status AC
        </CardTitle>
        <span className="rounded-md bg-muted/60 p-1.5 text-muted-foreground">
          <GaugeIcon className="h-3.5 w-3.5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
          <span className="text-2xl font-semibold tracking-tight">
            {tone.label}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant={tone.badgeVariant}>{tone.label}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {reading ? "Diperbarui baru saja" : "Menunggu data"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
