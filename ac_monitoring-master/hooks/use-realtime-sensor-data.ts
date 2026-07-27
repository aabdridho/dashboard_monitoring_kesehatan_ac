"use client";

import * as React from "react";
import {
  onChildAdded,
  query,
  ref,
  orderByKey,
  limitToLast,
} from "firebase/database";

import {
  FIREBASE_PATHS,
  getFirebaseDatabase,
  isFirebaseConfigured,
} from "@/services/firebase";
import { createMockSensorService } from "@/services/mock-sensor-service";
import { deriveACStatusFromSensors } from "@/lib/fuzzy";
import type {
  ConnectionState,
  DeviceStatus,
  SensorReading,
} from "@/types/sensor";

export interface UseRealtimeSensorDataResult {
  reading: SensorReading | null;
  connection: ConnectionState;
  status: DeviceStatus;
  isMock: boolean;
}

const OFFLINE_AFTER_MS = 8000;

export function useRealtimeSensorData(): UseRealtimeSensorDataResult {
  const [acData, setAcData] = React.useState<any>(null);
  const [indoorData, setIndoorData] = React.useState<any>(null);
  const [kwhData, setKwhData] = React.useState<any>(null);
  const [outdoorData, setOutdoorData] = React.useState<any>(null);
  const [reading, setReading] = React.useState<SensorReading | null>(null);
  const [connection, setConnection] =
    React.useState<ConnectionState>("reconnecting");
  const [isMock, setIsMock] = React.useState<boolean>(false);

  const lastUpdateRef = React.useRef<number>(0);

  React.useEffect(() => {
    let unsubCurrent: (() => void) | null = null;
    let unsubConn: (() => void) | null = null;
    let unsubAc: (() => void) | null = null;
    let unsubIndoor: (() => void) | null = null;
    let unsubKwh: (() => void) | null = null;
    let unsubOutdoor: (() => void) | null = null;

    const watchdog = setInterval(() => {
      if (
        lastUpdateRef.current &&
        Date.now() - lastUpdateRef.current > OFFLINE_AFTER_MS
      ) {
        setConnection("offline");
      }
    }, 2000);

    // Prefer Firebase Realtime Database. Only fall back to the bundled export
    // file when Firebase is unavailable or not configured. This ensures the
    // dashboard reflects live data from the database rather than a manual export.
    (async () => {
      if (isFirebaseConfigured()) {
        setIsMock(false);
        const db = getFirebaseDatabase();

        const setupSubscription = (path: string, setter: (data: any) => void) => {
          const historyRef = ref(db, `${path}/History`);
          const q = query(historyRef, orderByKey(), limitToLast(1));
          return onChildAdded(q, (snapshot) => {
            if (snapshot.exists()) {
              setter(snapshot.val());
            }
          });
        };

        unsubAc = setupSubscription(FIREBASE_PATHS.ac, setAcData);
        unsubIndoor = setupSubscription(FIREBASE_PATHS.indoor, setIndoorData);
        unsubKwh = setupSubscription(FIREBASE_PATHS.kwh, setKwhData);
        unsubOutdoor = setupSubscription(
          FIREBASE_PATHS.outdoor,
          setOutdoorData
        );
        return;
      }

      try {
        const mod = await import("@/services/export-sensor-service");
        const service = mod.createExportSensorService();
        setIsMock(false);
        unsubCurrent = service.subscribeCurrent((next) => {
          lastUpdateRef.current = Date.now();
          const ts = new Date().toISOString();
          console.groupCollapsed(`Telemetry received (export): ${ts}`);
          console.log(next);
          console.groupEnd();
          setReading(next);
          setConnection("live");
        });
        unsubConn = service.subscribeConnection(setConnection);
        return;
      } catch (err) {
        // no export present — continue to mock path
      }

      // No export and no Firebase -> mock
      setIsMock(true);
      const service = createMockSensorService();
      unsubCurrent = service.subscribeCurrent((next) => {
        lastUpdateRef.current = Date.now();
        const ts = new Date().toISOString();
        console.groupCollapsed(`Telemetry received (mock): ${ts}`);
        console.log(next);
        console.groupEnd();
        setReading(next);
        setConnection("live");
      });
      unsubConn = service.subscribeConnection(setConnection);
    })();

    return () => {
      if (unsubCurrent) unsubCurrent();
      if (unsubConn) unsubConn();
      clearInterval(watchdog);
    };
  }, []);

  React.useEffect(() => {
    if (acData && indoorData && kwhData && outdoorData) {
      const readNumber = (value: unknown): number => {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };

      const pickValue = (source: Record<string, unknown> | null | undefined, keys: string[]) => {
        if (!source) return 0;
        for (const key of keys) {
          const value = source[key];
          if (value !== undefined && value !== null && value !== "") {
            return readNumber(value);
          }
        }
        return 0;
      };

      const derivedStatus = deriveACStatusFromSensors({
        setpoint: pickValue(acData, ["Setpoint", "SetPoint", "setpoint", "SetPointC"]),
        supply_temp: pickValue(acData, ["Temperature", "Temp", "temperature", "supply_temp"]),
        indoor_temp: pickValue(indoorData, ["Temperature", "TemperatureC", "temperature", "indoor_temp"]),
        outdoor_temp: pickValue(outdoorData, ["Temperature", "TemperatureC", "temperature", "outdoor_temp"]),
        power: pickValue(kwhData, ["Daya", "Power", "power", "W"]),
      });

      // Ensure derivedStatus is a valid DeviceStatus
      const finalStatus: DeviceStatus = (derivedStatus === "healthy" || derivedStatus === "warning") ? derivedStatus : "healthy";

      const combinedReading: SensorReading = {
        indoor_temp: pickValue(indoorData, ["Temperature", "TemperatureC", "temperature", "indoor_temp"]),
        outdoor_temp: pickValue(outdoorData, ["Temperature", "TemperatureC", "temperature", "outdoor_temp"]),
        supply_temp: pickValue(acData, ["Temperature", "Temp", "temperature", "supply_temp"]),
        setpoint: pickValue(acData, ["Setpoint", "SetPoint", "setpoint", "SetPointC"]),
        humidity: pickValue(acData, ["Humidity", "humidity", "HumidityPercent"]),
        voltage: pickValue(kwhData, ["Tegangan", "Voltage", "voltage", "V", "AvgTegangan"]),
        current: pickValue(kwhData, ["Arus", "Current", "current", "A", "AvgArus"]),
        power: pickValue(kwhData, ["Daya", "Power", "power", "W", "AvgDaya"]),
        energy: pickValue(kwhData, ["Energi", "Energy", "energy", "kWh", "AvgEnergi"]),
        power_factor: pickValue(kwhData, ["PowerFactor", "powerFactor", "power_factor", "PF", "AvgPowerFactor"]),
        status: finalStatus,
        timestamp: Date.now(),
      };

      // Apply test data overlay if testing is active
      (async () => {
        const testModeStored = typeof window !== "undefined" ? window.localStorage.getItem("ac-monitoring-test-mode") : "none";
        if (testModeStored && testModeStored !== "none") {
          try {
            const { getTestSensorService } = await import("@/services/test-sensor-service");
            const testService = getTestSensorService();
            const testData = testService.generateTestReading(combinedReading);
            
            // Merge test data into combinedReading
            const testedReading: SensorReading = { ...combinedReading, ...testData };
            
            // Recalculate status with test data
            const { deriveACStatusFromSensors } = await import("@/lib/fuzzy");
            const testStatus = deriveACStatusFromSensors(testedReading);
            testedReading.status = testStatus;

            const ts = new Date().toISOString();
            console.groupCollapsed(`Telemetry received (firebase + TEST: ${testModeStored}): ${ts}`);
            console.log(testedReading);
            console.groupEnd();
            setReading(testedReading);
          } catch (err) {
            console.error("[Test Mode Error]", err);
            const ts = new Date().toISOString();
            console.groupCollapsed(`Telemetry received (firebase): ${ts}`);
            console.log(combinedReading);
            console.groupEnd();
            setReading(combinedReading);
          }
        } else {
          const ts = new Date().toISOString();
          console.groupCollapsed(`Telemetry received (firebase): ${ts}`);
          console.log(combinedReading);
          console.groupEnd();
          setReading(combinedReading);
        }
      })();

      lastUpdateRef.current = Date.now();
      setConnection("live");
    }
  }, [acData, indoorData, kwhData, outdoorData]);

  const status: DeviceStatus = React.useMemo(() => {
    if (!reading) return "offline";
    if (connection === "offline") return "offline";
    return reading.status ?? "healthy";
  }, [reading, connection]);

  return { reading, connection, status, isMock };
}