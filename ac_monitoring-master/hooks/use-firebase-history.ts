"use client";

import * as React from "react";
import { query, ref, orderByKey, limitToLast, onValue } from "firebase/database";
import { getFirebaseDatabase, isFirebaseConfigured, FIREBASE_PATHS } from "@/services/firebase";
import { deriveACStatusFromSensors } from "@/lib/fuzzy";
import type { SensorReading } from "@/types/sensor";

function parseTimestamp(ts: any): number {
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const formatted = ts.includes(" ") ? ts.replace(" ", "T") : ts;
    const parsed = Date.parse(formatted);
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

export function useFirebaseHistory(limit: number = 1000) {
  const [rawHistory, setRawHistory] = React.useState<SensorReading[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [testMode, setTestMode] = React.useState<string>(() => {
    if (typeof window === "undefined") return "none";
    return window.localStorage.getItem("ac-monitoring-test-mode") || "none";
  });

  React.useEffect(() => {
    const handleStorage = () => {
      const currentMode = window.localStorage.getItem("ac-monitoring-test-mode") || "none";
      setTestMode(currentMode);
    };

    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const db = getFirebaseDatabase();

    const acRef = query(ref(db, `${FIREBASE_PATHS.ac}/History`), orderByKey(), limitToLast(limit));
    const indoorRef = query(ref(db, `${FIREBASE_PATHS.indoor}/History`), orderByKey(), limitToLast(limit));
    const outdoorRef = query(ref(db, `${FIREBASE_PATHS.outdoor}/History`), orderByKey(), limitToLast(limit));
    const kwhRef = query(ref(db, `${FIREBASE_PATHS.kwh}/History`), orderByKey(), limitToLast(limit));

    let acData: any[] = [];
    let indoorData: any[] = [];
    let outdoorData: any[] = [];
    let kwhData: any[] = [];

    const mergeAndSet = () => {
      const allPoints: Partial<SensorReading>[] = [];

      acData.forEach((item) => {
        const t = parseTimestamp(item.timestamp);
        allPoints.push({
          timestamp: t,
          supply_temp: item.Temperature ?? item.temperature ?? item.Temp,
          humidity: item.Humidity ?? item.humidity,
          setpoint: item.SetPoint ?? item.Setpoint ?? item.setpoint,
        });
      });

      indoorData.forEach((item) => {
        const t = parseTimestamp(item.timestamp);
        allPoints.push({
          timestamp: t,
          indoor_temp: item.Temperature ?? item.TemperatureC ?? item.temperature,
        });
      });

      outdoorData.forEach((item) => {
        const t = parseTimestamp(item.timestamp);
        allPoints.push({
          timestamp: t,
          outdoor_temp: item.Temperature ?? item.TemperatureC ?? item.temperature,
        });
      });

      kwhData.forEach((item) => {
        const t = parseTimestamp(item.timestamp);
        allPoints.push({
          timestamp: t,
          voltage: item.AvgTegangan ?? item.Tegangan ?? item.Voltage ?? item.voltage,
          current: item.AvgArus ?? item.Arus ?? item.Current ?? item.current,
          power: item.AvgDaya ?? item.Daya ?? item.Power ?? item.power,
          energy: item.AvgEnergi ?? item.Energi ?? item.Energy ?? item.energy,
          power_factor: item.AvgPowerFactor ?? item.PowerFactor ?? item.powerFactor,
        });
      });

      allPoints.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

      const merged: SensorReading[] = [];
      const threshold = 60000;

      allPoints.forEach((point) => {
        if (!point.timestamp) return;
        const last = merged[merged.length - 1];

        if (last && Math.abs(point.timestamp - last.timestamp) <= threshold) {
          if (point.supply_temp !== undefined) last.supply_temp = point.supply_temp;
          if (point.indoor_temp !== undefined) last.indoor_temp = point.indoor_temp;
          if (point.outdoor_temp !== undefined) last.outdoor_temp = point.outdoor_temp;
          if (point.humidity !== undefined) last.humidity = point.humidity;
          if (point.setpoint !== undefined) last.setpoint = point.setpoint;
          if (point.voltage !== undefined) last.voltage = point.voltage;
          if (point.current !== undefined) last.current = point.current;
          if (point.power !== undefined) last.power = point.power;
          if (point.energy !== undefined) last.energy = point.energy;
          if (point.power_factor !== undefined) last.power_factor = point.power_factor;
        } else {
          merged.push({
            timestamp: point.timestamp,
            supply_temp: point.supply_temp ?? 0,
            indoor_temp: point.indoor_temp ?? 0,
            outdoor_temp: point.outdoor_temp ?? 0,
            humidity: point.humidity ?? 0,
            setpoint: point.setpoint ?? 21,
            voltage: point.voltage ?? 0,
            current: point.current ?? 0,
            power: point.power ?? 0,
            energy: point.energy ?? 0,
            power_factor: point.power_factor ?? 1,
          });
        }
      });

      merged.forEach((item) => {
        item.status = deriveACStatusFromSensors(item);
      });

      setRawHistory(merged);
      setLoading(false);
    };

    const unsubAC = onValue(acRef, (snapshot) => {
      acData = snapshot.exists() ? Object.values(snapshot.val()) : [];
      mergeAndSet();
    });

    const unsubIndoor = onValue(indoorRef, (snapshot) => {
      indoorData = snapshot.exists() ? Object.values(snapshot.val()) : [];
      mergeAndSet();
    });

    const unsubOutdoor = onValue(outdoorRef, (snapshot) => {
      outdoorData = snapshot.exists() ? Object.values(snapshot.val()) : [];
      mergeAndSet();
    });

    const unsubKWH = onValue(kwhRef, (snapshot) => {
      kwhData = snapshot.exists() ? Object.values(snapshot.val()) : [];
      mergeAndSet();
    });

    return () => {
      unsubAC();
      unsubIndoor();
      unsubOutdoor();
      unsubKWH();
    };
  }, [limit]);

  const history = React.useMemo(() => {
    if (testMode === "none") {
      return rawHistory;
    }

    return rawHistory.map((item, idx) => {
      let cond = testMode;
      if (testMode === "mixed") {
        cond = idx % 2 === 0 ? "healthy" : "warning";
      }

      const tested: SensorReading = { ...item };
      if (cond === "healthy") {
        tested.setpoint = 20;
        tested.supply_temp = 21;
        tested.indoor_temp = 25;
        tested.outdoor_temp = 30;
        tested.power = 1200;
        tested.status = "healthy";
      } else if (cond === "warning") {
        tested.setpoint = 20;
        tested.supply_temp = 27;
        tested.indoor_temp = 31;
        tested.outdoor_temp = 30;
        tested.power = 2500;
        tested.status = "warning";
      }
      return tested;
    });
  }, [rawHistory, testMode]);

  return { history, loading };
}
