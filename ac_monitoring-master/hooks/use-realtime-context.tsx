"use client";

import * as React from "react";

import {
  useRealtimeSensorData,
  type UseRealtimeSensorDataResult,
} from "@/hooks/use-realtime-sensor-data";

/**
 * Context wrapper around `useRealtimeSensorData`.
 *
 * Why: the top-nav pill and the dashboard cards both need the same
 * connection state. Subscribing twice would double the Firebase listener
 * load and cause subtle UI flicker between the two states.
 *
 * The provider runs the hook once at the top of the shell; downstream
 * components consume via `useRealtimeContext()`.
 */

const RealtimeContext = React.createContext<UseRealtimeSensorDataResult | null>(
  null,
);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const value = useRealtimeSensorData();
  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): UseRealtimeSensorDataResult {
  const ctx = React.useContext(RealtimeContext);
  if (!ctx) {
    throw new Error(
      "useRealtimeContext must be used inside <RealtimeProvider>.",
    );
  }
  return ctx;
}