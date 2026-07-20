/**
 * Sensor & device type model — single source of truth.
 *
 * The ESP32 writes a `SensorReading` shape to `/sensors/current` in
 * Firebase Realtime Database. We also keep a rolling list under
 * `/sensors/history` (capped by the device firmware) so the History &
 * Analytics pages can render without a separate backend.
 */

export type ConnectionState = "live" | "reconnecting" | "offline";

export type Severity = "healthy" | "warning" | "critical";

/**
 * Status reported by the AC's firmware — drives the big "Room status"
 * banner and the AC Status card on the dashboard.
 *
 *  - "healthy"   → all metrics inside safe limits
 *  - "warning"   → at least one metric outside healthy range
 *  - "critical"  → at least one metric tripped the critical threshold
 *  - "offline"   → no recent readings; ESP32 unreachable
 */
export type DeviceStatus = Severity | "offline";

/** WiFi signal strength reported by the ESP32, in dBm. */
export type WifiRssi = number;

/**
 * One row of sensor data as written by the ESP32. Field names match the
 * JSON keys in `/sensors/current` to avoid an adapter layer.
 *
 * `timestamp` is a Unix epoch in milliseconds (Firebase server timestamp
 * when the device writes via the REST API).
 */
export interface SensorReading {
  indoor_temp: number; // °C
  outdoor_temp: number; // °C
  supply_temp: number; // °C
  setpoint: number; // °C
  voltage: number;     // V
  current: number;     // A
  power: number;       // W
  power_factor: number;
  humidity: number; // %
  energy: number;      // kWh (lifetime / session)
  status?: DeviceStatus;
  wifiRssi?: WifiRssi;
  timestamp: number;
}

/**
 * Same as `SensorReading` but with `status` optional — used when reading
 * raw snapshots before the firmware has set the field.
 */
export type PartialSensorReading = Partial<SensorReading> &
  Pick<SensorReading, "timestamp">;

/**
 * Convenience: which metric a card / chart is rendering.
 * Drives icon, unit suffix, and threshold selection.
 */
export type SensorMetric =
  | "indoor_temp"
  | "outdoor_temp"
  | "supply_temp"
  | "setpoint"
  | "voltage"
  | "current"
  | "power"
  | "power_factor"
  | "energy"
  | "humidity";

export const METRIC_UNITS: Record<SensorMetric, string> = {
  indoor_temp: "°C",
  outdoor_temp: "°C",
  supply_temp: "°C",
  setpoint: "°C",
  voltage: "V",
  current: "A",
  power: "W",
  power_factor: "",
  energy: "kWh",
  humidity: "%",
};

/** Number of decimals to display for each metric. */
export const METRIC_PRECISION: Record<SensorMetric, number> = {
  indoor_temp: 1,
  outdoor_temp: 1,
  supply_temp: 1,
  setpoint: 1,
  voltage: 1,
  current: 2,
  power: 0,
  power_factor: 2,
  energy: 2,
  humidity: 0,
};