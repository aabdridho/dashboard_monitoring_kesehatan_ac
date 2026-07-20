
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeSensorData } from "@/hooks/use-realtime-sensor-data";
import type { DeviceStatus } from "@/types/sensor";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface HistoryEntry {
  timestamp: number;
  indoor_temp: number;
  outdoor_temp: number;
  power: number;
  energy: number;
  status: DeviceStatus;
}

export default function AnalyticsPage() {
  const { reading } = useRealtimeSensorData();
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);

  React.useEffect(() => {
    if (!reading) return;

    setHistory((prev) => {
      const now = Date.now();
      const thirtyDaysAgo = now - THIRTY_DAYS_MS;

      const filtered = prev.filter((h) => h.timestamp > thirtyDaysAgo);
      const newEntry: HistoryEntry = {
        timestamp: now,
        indoor_temp: reading.indoor_temp,
        outdoor_temp: reading.outdoor_temp,
        power: reading.power,
        energy: reading.energy,
        status: reading.status ?? "healthy",
      };

      return [...filtered, newEntry];
    });
  }, [reading]);

  const calculateAverage = (getter: (h: HistoryEntry) => number) => {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, h) => acc + getter(h), 0);
    return parseFloat((sum / history.length).toFixed(1));
  };

  const calculateHealthStatus = () => {
    const healthy = history.filter((h) => h.status === "healthy").length;
    const warning = history.filter((h) => h.status === "warning").length;
    const critical = history.filter((h) => h.status === "critical").length;
    const total = history.length || 1;

    return {
      healthy: parseFloat(((healthy / total) * 100).toFixed(1)),
      warning: parseFloat(((warning / total) * 100).toFixed(1)),
      critical: parseFloat(((critical / total) * 100).toFixed(1)),
    };
  };

  const avgIndoorTemp = calculateAverage((h) => h.indoor_temp);
  const avgOutdoorTemp = calculateAverage((h) => h.outdoor_temp);
  const avgPower = calculateAverage((h) => h.power);
  const totalEnergy = calculateAverage((h) => h.energy);
  const healthStatus = calculateHealthStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Explore trends and statistics of your AC usage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Indoor Temp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgIndoorTemp}°C</div>
            <p className="text-xs text-muted-foreground">
              Average over the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Outdoor Temp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOutdoorTemp}°C</div>
            <p className="text-xs text-muted-foreground">
              Average over the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Power</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPower} W</div>
            <p className="text-xs text-muted-foreground">
              Average consumption rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Energy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnergy} kWh</div>
            <p className="text-xs text-muted-foreground">
              Consumed in the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg font-semibold text-green-600">
              {healthStatus.healthy}% Healthy
            </div>
            <div className="text-lg font-semibold text-yellow-600">
              {healthStatus.warning}% Warning
            </div>
            {healthStatus.critical > 0 && (
              <div className="text-lg font-semibold text-red-600">
                {healthStatus.critical}% Critical
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}