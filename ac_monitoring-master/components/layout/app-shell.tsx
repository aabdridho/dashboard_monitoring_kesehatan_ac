"use client";

import * as React from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { RealtimeProvider, useRealtimeContext } from "@/hooks/use-realtime-context";
import {
  MetricSeriesProvider,
  useMetricSeries,
} from "@/hooks/use-metric-series-context";
import type { SensorReading } from "@/types/sensor";

/**
 * App shell — composes `Sidebar` (persistent on desktop) + `TopNav` +
 * a single client-managed mobile drawer.
 *
 * Provider stack:
 *   RealtimeProvider        — one Firebase subscription, exposes reading
 *      └─ MetricSeriesBridge (subscribes to reading & pushes into series)
 *   MetricSeriesProvider    — bounded rolling buffer of recent readings
 *
 * Children further down the tree can call `useRealtimeContext()` AND
 * `useMetricSeries()` independently.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <RealtimeProvider>
      <MetricSeriesProvider>
        <MetricSeriesBridge />
        <div className="flex min-h-svh">
          <Sidebar />
          <MobileSidebar
            open={mobileNavOpen}
            onOpenChange={setMobileNavOpen}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <TopNav onMobileMenuClick={() => setMobileNavOpen(true)} />

            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </MetricSeriesProvider>
    </RealtimeProvider>
  );
}

/**
 * Lives inside both providers so it can read the realtime stream and
 * forward every reading into the rolling buffer. Resets the buffer when
 * the connection flips to `offline` for long, to avoid stale left edges
 * in the chart after a reconnect.
 *
 * Uses `pushRef.current()` and `resetRef.current()` instead of the
 * unstable function references returned from `useMetricSeries()` —
 * putting `push` / `reset` in effect deps would re-fire this effect
 * every render and create an infinite loop.
 */
function MetricSeriesBridge() {
  const { reading, connection } = useRealtimeContext();
  const { pushRef, resetRef } = useMetricSeries();
  const wasOfflineRef = React.useRef(false);

  React.useEffect(() => {
    if (reading) pushRef.current(reading as SensorReading);
  }, [reading, pushRef]);

  React.useEffect(() => {
    if (connection === "offline") {
      wasOfflineRef.current = true;
    } else if (connection === "live" && wasOfflineRef.current) {
      resetRef.current();
      wasOfflineRef.current = false;
    }
  }, [connection, resetRef]);

  return null;
}
