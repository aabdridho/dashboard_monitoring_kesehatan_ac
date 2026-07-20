"use client";

import * as React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { cn } from "@/utils/cn";

/**
 * `AreaChart` — on-brand wrapper around `recharts.AreaChart`.
 *
 * Why a wrapper:
 *  - Recharts injects default colors / styles through its `theme` prop
 *    + element props; centralizing them here keeps each consumer
 *    (temperature, humidity, voltage, …) to a single line of usage.
 *  - We render a per-chart linear gradient defined in `<defs>` (CSS
 *    gradients can't be referenced by `fill="url(#…)"` reliably inside
 *    Recharts in this version).
 *  - The tooltip card uses our existing card primitive, not Recharts'
 *    default white-on-black popup, so it stays on brand.
 */

export interface AreaChartProps {
  data: ReadonlyArray<Record<string, number | string>>;
  /** Field key on each row to plot. */
  seriesKey: string;
  /** Tint controlling stroke and area gradient. */
  tone?: "primary" | "accent" | "info";
  /** Y-axis tick formatter. */
  yTickFormatter?: (value: number) => string;
  /** Time formatter for the X axis ticks. */
  xTickFormatter?: (value: number) => string;
  /** Render a Y domain override (e.g. for humidity 0–100). */
  yDomain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
  /** Tailwind height classes for the responsive container. */
  heightClass?: string;
  className?: string;
}

const TONE_HEX: Record<NonNullable<AreaChartProps["tone"]>, { stroke: string; fill: string; gradient: [string, string] }> = {
  primary: {
    stroke: "oklch(0.74 0.06 12)",
    fill: "oklch(0.74 0.06 12 / 0.35)",
    gradient: ["oklch(0.74 0.06 12 / 0.45)", "oklch(0.74 0.06 12 / 0)"],
  },
  accent: {
    stroke: "oklch(0.68 0.13 12)",
    fill: "oklch(0.68 0.13 12 / 0.35)",
    gradient: ["oklch(0.68 0.13 12 / 0.45)", "oklch(0.68 0.13 12 / 0)"],
  },
  info: {
    stroke: "oklch(0.6 0.1 230)",
    fill: "oklch(0.6 0.1 230 / 0.35)",
    gradient: ["oklch(0.6 0.1 230 / 0.45)", "oklch(0.6 0.1 230 / 0)"],
  },
};

export function AreaChart({
  data,
  seriesKey,
  tone = "primary",
  yTickFormatter,
  xTickFormatter,
  yDomain,
  heightClass = "h-56",
  className,
}: AreaChartProps) {
  const palette = TONE_HEX[tone];
  const gradientId = React.useId();

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground",
          heightClass,
          className,
        )}
      >
        Waiting for data…
      </div>
    );
  }

  return (
    <div className={cn("w-full", heightClass, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data as Record<string, number | string>[]}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={palette.gradient[0]} />
              <stop offset="100%" stopColor={palette.gradient[1]} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="oklch(0.92 0.015 12)"
            strokeDasharray="3 4"
            vertical={false}
          />

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={xTickFormatter ?? defaultTimeTick}
            tick={{ fill: "oklch(0.55 0.02 12)", fontSize: 11 }}
            stroke="oklch(0.92 0.015 12)"
            minTickGap={48}
          />
          <YAxis
            tickFormatter={yTickFormatter ?? ((v: number) => v.toString())}
            tick={{ fill: "oklch(0.55 0.02 12)", fontSize: 11 }}
            stroke="oklch(0.92 0.015 12)"
            width={48}
            domain={yDomain ?? ["auto", "auto"]}
          />

          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                yFormatter={yTickFormatter}
                xFormatter={xTickFormatter}
                unit={unitForKey(seriesKey)}
              />
            )}
            cursor={{ stroke: palette.stroke, strokeOpacity: 0.4 }}
          />

          <Area
            type="monotone"
            dataKey={seriesKey}
            stroke={palette.stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive
            animationDuration={350}
            dot={false}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function defaultTimeTick(value: number): string {
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Recharts ships its own tooltip popup; we replace it with something
 * that matches the rest of the dashboard (card surface, soft shadow).
 */
interface TooltipPayloadEntry {
  name?: number | string;
  value?: number | string | ReadonlyArray<number | string>;
  dataKey?: string | number | ((obj: unknown) => unknown);
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadEntry>;
  label?: number | string;
  yFormatter?: (v: number) => string;
  xFormatter?: (v: number) => string;
  unit?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  yFormatter,
  xFormatter,
  unit,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  if (!point) return null;
  const valueRaw = Array.isArray(point.value)
    ? point.value[0]
    : point.value;
  const raw =
    typeof valueRaw === "number" ? valueRaw : Number(valueRaw);
  const valueLabel =
    Number.isFinite(raw) && yFormatter
      ? yFormatter(raw)
      : (String(valueRaw ?? ""));
  const xLabel =
    typeof label === "number" && xFormatter ? xFormatter(label) : label;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft-lg">
      <div className="font-medium text-foreground tabular-nums">
        {valueLabel}
        {unit ? <span className="text-muted-foreground">{unit}</span> : null}
      </div>
      {xLabel !== undefined ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {xLabel}
        </div>
      ) : null}
    </div>
  );
}

function unitForKey(key: string): string | undefined {
  if (key === "temperature") return "°C";
  if (key === "humidity") return "%";
  if (key === "voltage") return "V";
  if (key === "current") return "A";
  if (key === "power") return "W";
  if (key === "energy") return "kWh";
  return undefined;
}
