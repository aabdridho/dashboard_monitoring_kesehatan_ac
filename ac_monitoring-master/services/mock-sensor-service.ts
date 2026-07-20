"use client";

import type {
  ConnectionState,
  DeviceStatus,
  SensorReading,
} from "@/types/sensor";

/**
 * Mock service — simulates the ESP32 sensor stream for development and
 * preview environments without Firebase env vars.
 *
 * Emits a slowly drifting reading every 5 seconds, cycling through the
 * three statuses so the UI can show its states without a real device.
 */

type Listener<T> = (value: T) => void;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Drift `value` by ±`amplitude` and clamp. */
function drift(value: number, amplitude: number, min: number, max: number) {
  return clamp(value + (Math.random() - 0.5) * amplitude, min, max);
}

function nextStatus(temperature: number): DeviceStatus {
  if (temperature >= 30 || temperature <= 16) return "critical";
  if (temperature >= 27 || temperature <= 18) return "warning";
  return "healthy";
}

export interface MockSensorService {
  subscribeCurrent: (listener: Listener<SensorReading | null>) => () => void;
  subscribeConnection: (listener: Listener<ConnectionState>) => () => void;
}

export function createMockSensorService(): MockSensorService {
  // Seed a plausible starting state.
  let temperature = 24.8;
  let humidity = 58;
  let voltage = 220;
  let current = 2.1;
  let power = 460;
  let energy = 12.4;
  let wifiRssi = -58;

  const currentListeners = new Set<Listener<SensorReading | null>>();
  const connectionListeners = new Set<Listener<ConnectionState>>();

  const emitCurrent = () => {
    if (currentListeners.size === 0) return;
    const reading: SensorReading = {
      indoor_temp: +temperature.toFixed(1),
      outdoor_temp: +temperature.toFixed(1),
      supply_temp: +temperature.toFixed(1),
      setpoint: 24,
      humidity: Math.round(humidity),
      voltage: +voltage.toFixed(1),
      current: +current.toFixed(2),
      power: Math.round(power),
      power_factor: 0.95,
      energy: +energy.toFixed(2),
      status: nextStatus(temperature),
      wifiRssi,
      timestamp: Date.now(),
    };
    currentListeners.forEach((cb) => cb(reading));
  };

  const emitConnection = (state: ConnectionState) => {
    connectionListeners.forEach((cb) => cb(state));
  };

  // Announce "live" right away so the pill in the top-nav goes green,
  // matching what a real Firebase connection would do.
  queueMicrotask(() => emitConnection("live"));

  // Tick every 5s. Drift the metrics; accumulate energy by power × time.
  const interval = setInterval(() => {
    temperature = drift(temperature, 0.4, 14, 35);
    humidity = drift(humidity, 1.5, 30, 80);
    voltage = drift(voltage, 1.5, 210, 230);
    current = drift(current, 0.3, 0.5, 4.5);
    power = Math.max(80, Math.round(voltage * current));
    energy += (power / 1000) * (5 / 3600); // 5-second slice in kWh
    wifiRssi = Math.round(drift(wifiRssi, 1, -85, -45));

    emitCurrent();
  }, 5000);

  return {
    subscribeCurrent(listener) {
      currentListeners.add(listener);
      // Push current snapshot immediately on subscribe.
      const reading: SensorReading = {
        indoor_temp: +temperature.toFixed(1),
        outdoor_temp: +temperature.toFixed(1),
        supply_temp: +temperature.toFixed(1),
        setpoint: 24,
        humidity: Math.round(humidity),
        voltage: +voltage.toFixed(1),
        current: +current.toFixed(2),
        power: Math.round(power),
        power_factor: 0.95,
        energy: +energy.toFixed(2),
        status: nextStatus(temperature),
        wifiRssi,
        timestamp: Date.now(),
      };
      listener(reading);
      return () => currentListeners.delete(listener);
    },
    subscribeConnection(listener) {
      connectionListeners.add(listener);
      listener("live");
      return () => connectionListeners.delete(listener);
    },
  };
}
