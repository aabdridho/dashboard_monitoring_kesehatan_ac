"use client";

import type { SensorReading, ConnectionState } from "@/types/sensor";

// Import the exported JSON file that the user provided. `resolveJsonModule`
// is enabled in `tsconfig.json` so this will bundle at build-time for
// local development.
import exportData from "../monitoring-kesehatan-ac-default-rtdb-export (1).json";

type Listener<T> = (value: T) => void;

export interface ExportSensorService {
  subscribeCurrent: (listener: Listener<SensorReading | null>) => () => void;
  subscribeConnection: (listener: Listener<ConnectionState>) => () => void;
}

function coerceNumber(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Create a sensor service that emits the `Latest` snapshot from the
 * exported Realtime Database JSON. Emits once immediately then every 3s
 * so the UI shows live updates.
 */
export function createExportSensorService(): ExportSensorService {
  const currentListeners = new Set<Listener<SensorReading | null>>();
  const connectionListeners = new Set<Listener<ConnectionState>>();

  // Helper to build a SensorReading from the export structure. We try a
  // few common key names and fall back to 0 when absent.
  function buildReading(): SensorReading {
    const acLatest = (exportData as any).AC?.Latest ?? {};
    const indoorLatest = (exportData as any).Indoor?.Latest ?? {};
    const kwhLatest = (exportData as any).KWHMeter?.Latest ?? {};
    const outdoorLatest = (exportData as any).Outdoor?.Latest ?? {};

    const reading: SensorReading = {
      indoor_temp: coerceNumber(indoorLatest.Temperature ?? indoorLatest.TemperatureC ?? indoorLatest.temperature),
      outdoor_temp: coerceNumber(outdoorLatest.Temperature ?? outdoorLatest.TemperatureC ?? outdoorLatest.temperature),
      supply_temp: coerceNumber(acLatest.Temperature ?? acLatest.Temp ?? acLatest.temperature),
      setpoint: coerceNumber(acLatest.Setpoint ?? acLatest.SetPoint ?? acLatest.setpoint),
      voltage: coerceNumber(kwhLatest.Tegangan ?? kwhLatest.Voltage ?? kwhLatest.voltage),
      current: coerceNumber(kwhLatest.Arus ?? kwhLatest.Current ?? kwhLatest.current),
      power: coerceNumber(kwhLatest.Daya ?? kwhLatest.Power ?? kwhLatest.power),
      power_factor: coerceNumber(kwhLatest.PowerFactor ?? kwhLatest.powerFactor ?? kwhLatest.power_factor),
      energy: coerceNumber(kwhLatest.Energi ?? kwhLatest.Energy ?? kwhLatest.energy),
      humidity: coerceNumber(acLatest.Humidity ?? acLatest.humidity),
      status: (acLatest.Status as any) ?? undefined,
      wifiRssi: coerceNumber(acLatest.WiFiRSSI ?? acLatest.wifiRssi ?? acLatest.wifi_rssi),
      timestamp: Date.now(),
    };

    return reading;
  }

  const emitCurrent = () => {
    if (currentListeners.size === 0) return;
    const r = buildReading();
    currentListeners.forEach((cb) => cb(r));
  };

  const emitConnection = (state: ConnectionState) => {
    connectionListeners.forEach((cb) => cb(state));
  };

  // Immediately announce live and the first reading.
  queueMicrotask(() => {
    emitConnection("live");
    emitCurrent();
  });

  const interval = setInterval(() => {
    emitCurrent();
  }, 5000);

  return {
    subscribeCurrent(listener) {
      currentListeners.add(listener);
      // push immediate snapshot
      listener(buildReading());
      return () => currentListeners.delete(listener);
    },
    subscribeConnection(listener) {
      connectionListeners.add(listener);
      listener("live");
      return () => connectionListeners.delete(listener);
    },
  };
}
