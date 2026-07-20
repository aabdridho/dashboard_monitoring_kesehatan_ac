"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { classifyMetric } from "@/lib/thresholds";
import { formatMetric } from "@/lib/format";
import { useCountUp } from "@/hooks/use-count-up";
import { METRIC_PRECISION, type SensorMetric, type Severity } from "@/types/sensor";

import { TrendChip, type TrendDirection } from "@/components/dashboard/trend-chip";

/**
 * `MetricCard`
 *
 * The single visual unit used across the dashboard. Shows:
 *   - icon (top-left)
 *   - label (title row)
 *   - big animated value + smaller unit
 *   - small trend chip ("+0.4° vs 5s ago")
 *   - status border tint driven by `classifyMetric`
 *
 * Subtle: the card has a soft shadow and a 1px tinted border that changes
 * with severity — no flashy backgrounds; the family keeps that premium
 * Notion/Linear aesthetic.
 */

const SEVERITY_RING: Record<Severity, string> = {
  healthy: "ring-[var(--ring-healthy)]",
  warning: "ring-[var(--ring-warning)]",
  critical: "ring-[var(--ring-critical)]",
};

const SEVERITY_DOT: Record<Severity, string> = {
  healthy: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

export interface MetricCardProps {
  label: string;
  metric: SensorMetric;
  value: number | undefined | null;
  icon: LucideIcon;
  /** Optional history of recent values; the last two are used for the trend. */
  history?: ReadonlyArray<number>;
  /** Tint applied to the trend chip — see {@link TrendChip}. */
  trendTone?: "success" | "warning" | "destructive" | "muted";
  /** Sub-label for the trend (e.g. "vs 30s ago"). */
  trendCaption?: string;
}

export function MetricCard({
  label,
  metric,
  value,
  icon: Icon,
  history,
  trendTone = "muted",
  trendCaption = "vs last reading",
}: MetricCardProps) {
  const isValid = typeof value === "number" && !Number.isNaN(value);

  const animated = useCountUp(isValid ? value : 0, { duration: 700 });
  const { text, unit } = formatMetric(animated, metric);
  const severity: Severity = classifyMetric(metric, value);

  // Trend: compare the most recent two known values.
  const { direction, change } = React.useMemo(() => {
    if (!history || history.length < 2) {
      return { direction: "flat" as TrendDirection, change: 0 };
    }
    const last = history[history.length - 1] ?? 0;
    const prev = history[history.length - 2] ?? last;
    const diff = last - prev;
    const direction: TrendDirection =
      Math.abs(diff) < 0.005 ? "flat" : diff > 0 ? "up" : "down";
    return { direction, change: diff };
  }, [history]);

  const trendLabel =
    isValid && change
      ? `${change >= 0 ? "+" : ""}${change.toFixed(METRIC_PRECISION[metric])}${unit}`
      : "...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden ring-1 ring-inset transition-shadow hover:shadow-soft-lg",
          SEVERITY_RING[severity],
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[severity])}
              aria-hidden
            />
            <span className="rounded-md bg-muted/60 p-1.5 text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {isValid ? text : "..."}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {isValid ? unit : ""}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <TrendChip
              direction={direction}
              label={trendLabel}
              tint={trendTone}
            />
            <span className="text-[11px] text-muted-foreground">
              {SEVERITY_LABEL[severity]}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}