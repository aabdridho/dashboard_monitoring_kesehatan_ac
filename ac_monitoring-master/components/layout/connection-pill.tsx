"use client";

import { motion } from "framer-motion";
import { Loader2, Radio, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { useRealtimeContext } from "@/hooks/use-realtime-context";
import type { ConnectionState } from "@/types/sensor";

/**
 * Small pill in the top-nav showing the realtime connection state.
 *
 *   live         → green dot, soft pulse
 *   reconnecting → amber spinner, attempts to recover
 *   offline      → red, ESP32 unreachable
 *
 * When the dashboard is running on the mock fallback, we render a
 * neutral "Demo" pill so reviewers know the data is simulated.
 */
const STATE_CONFIG: Record<
  ConnectionState,
  {
    label: string;
    classes: string;
    Icon: React.ElementType;
  }
> = {
  live: {
    label: "Live",
    classes: "bg-success/15 text-success",
    Icon: Radio,
  },
  reconnecting: {
    label: "Reconnecting",
    classes: "bg-warning/20 text-warning",
    Icon: Loader2,
  },
  offline: {
    label: "Offline",
    classes: "bg-destructive/10 text-destructive",
    Icon: WifiOff,
  },
};

export function ConnectionPill() {
  const { connection, isMock } = useRealtimeContext();

  if (isMock) {
    return (
      <Badge variant="default" className="gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        Demo data
      </Badge>
    );
  }

  const config = STATE_CONFIG[connection];
  const Icon = config.Icon;

  return (
    <Badge
      variant="default"
      className={cn(
        "gap-1.5 border-transparent",
        config.classes,
      )}
    >
      <motion.span
        animate={
          connection === "live"
            ? { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }
            : { opacity: 1 }
        }
        transition={
          connection === "live"
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
        className="flex h-2 w-2 items-center justify-center"
      >
        <Icon
          className={cn(
            "h-3 w-3",
            connection === "reconnecting" && "animate-spin",
          )}
        />
      </motion.span>
      {config.label}
    </Badge>
  );
}