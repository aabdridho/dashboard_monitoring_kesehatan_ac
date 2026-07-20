"use client";

import * as React from "react";

import { useRealtimeContext } from "@/hooks/use-realtime-context";
import {
  useDeriveAlerts,
  type AlertItem,
} from "@/hooks/use-derive-alerts";

/**
 * `AlertsProvider`
 *
 * Wraps the realtime stream and the alerts derivation, then exposes the
 * derived alerts plus dismiss/markAllRead controls through context.
 *
 * "Dismiss" only removes the alert from the visible list — it does NOT
 * suppress future trips. To suppress a metric entirely we'd need a
 * settings page (coming in a later phase).
 */

interface AlertsContextValue {
  alerts: AlertItem[];
  unreadCount: number;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  markAllRead: () => void;
}

const AlertsContext = React.createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { reading } = useRealtimeContext();
  const alerts = useDeriveAlerts(reading);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [readMarker, setReadMarker] = React.useState<number>(Date.now());

  const visibleAlerts = React.useMemo(
    () => alerts.filter((a) => !dismissed.has(a.id)),
    [alerts, dismissed],
  );

  const unreadCount = React.useMemo(
    () => visibleAlerts.filter((a) => a.enteredAt > readMarker).length,
    [visibleAlerts, readMarker],
  );

  const value = React.useMemo<AlertsContextValue>(
    () => ({
      alerts: visibleAlerts,
      unreadCount,
      dismiss: (id) =>
        setDismissed((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        }),
      dismissAll: () =>
        setDismissed((prev) => {
          const next = new Set(prev);
          visibleAlerts.forEach((a) => next.add(a.id));
          return next;
        }),
      markAllRead: () => setReadMarker(Date.now()),
    }),
    [visibleAlerts, unreadCount],
  );

  return (
    <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
  );
}

export function useAlertsContext(): AlertsContextValue {
  const ctx = React.useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useAlertsContext must be used inside <AlertsProvider>.");
  }
  return ctx;
}