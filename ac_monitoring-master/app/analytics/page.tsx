
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebaseHistory } from "@/hooks/use-firebase-history";
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
  const { history: rawHistory } = useFirebaseHistory(5000); // larger limit for 30 days
  
  const history = React.useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;
    return rawHistory
      .filter((h) => (h.timestamp ?? 0) > thirtyDaysAgo)
      .map((h) => ({
        timestamp: h.timestamp ?? 0,
        indoor_temp: h.indoor_temp,
        outdoor_temp: h.outdoor_temp,
        power: h.power,
        energy: h.energy,
        status: h.status ?? "healthy",
      }));
  }, [rawHistory]);

  const calculateAverage = (getter: (h: HistoryEntry) => number) => {
    const validEntries = history.filter((h) => {
      const val = getter(h);
      return typeof val === "number" && !isNaN(val) && val > 0;
    });
    if (validEntries.length === 0) return 0;
    const sum = validEntries.reduce((acc, h) => acc + getter(h), 0);
    return parseFloat((sum / validEntries.length).toFixed(1));
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
              Rata-rata perhari
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
              Rata-rata perhari
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