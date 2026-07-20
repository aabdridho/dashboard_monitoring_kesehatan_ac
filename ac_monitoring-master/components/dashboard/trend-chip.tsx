"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/utils/cn";

/**
 * Small inline indicator for "value went up/down/flat vs the last reading".
 *
 * Polarity of `direction` is decoupled from `tint` so the chip can show a
 *   "drop is bad" (down + destructive) or
 *   "drop is good" (down + success)
 * depending on the metric's semantics. The metric card chooses both.
 */

export type TrendDirection = "up" | "down" | "flat";

export interface TrendChipProps {
  direction: TrendDirection;
  /** Pre-formatted absolute change, e.g. "+0.4°" or "-12W". */
  label: string;
  /** Tailwind semantic color (success | warning | destructive | muted). */
  tint?: "success" | "warning" | "destructive" | "muted";
  className?: string;
}

const TINT_CLASSES: Record<NonNullable<TrendChipProps["tint"]>, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function TrendChip({
  direction,
  label,
  tint = "muted",
  className,
}: TrendChipProps) {
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        TINT_CLASSES[tint],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
