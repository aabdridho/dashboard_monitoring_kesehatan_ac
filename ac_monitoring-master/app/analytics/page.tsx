"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, Flame, HeartPulse, Power, Zap } from "lucide-react";
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
  const { history: rawHistory } = useFirebaseHistory(5000);

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
  const avgEnergy = calculateAverage((h) => h.energy);
  const healthStatus = calculateHealthStatus();

  const cards = [
    {
      title: "Avg. Indoor Temp",
      value: `${avgIndoorTemp}°C`,
      caption: "Rata-rata perhari",
      icon: Flame,
      color: "text-amber-500",
    },
    {
      title: "Avg. Outdoor Temp",
      value: `${avgOutdoorTemp}°C`,
      caption: "Rata-rata perhari",
      icon: Flame,
      color: "text-orange-500",
    },
    {
      title: "Avg. Power",
      value: `${avgPower} W`,
      caption: "Rata-rata perhari",
      icon: Power,
      color: "text-blue-500",
    },
    {
      title: "Avg. Energy",
      value: `${avgEnergy} kWh`,
      caption: "Rata-rata perhari",
      icon: Zap,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Explore trends and statistics of your AC usage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="relative overflow-hidden ring-1 ring-inset ring-border/60 transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.title}
                  </CardTitle>
                  <span className="rounded-md bg-muted/60 p-1.5 text-muted-foreground">
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{item.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.caption}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: cards.length * 0.05 }}
        >
          <Card className="relative overflow-hidden ring-1 ring-inset ring-border/60 transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Health Status
              </CardTitle>
              <span className="rounded-md bg-muted/60 p-1.5 text-muted-foreground">
                <HeartPulse className="h-4 w-4 text-emerald-500" />
              </span>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-emerald-500">Healthy</span>
                  <span>{healthStatus.healthy}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${healthStatus.healthy}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-amber-500">Warning</span>
                  <span>{healthStatus.warning}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${healthStatus.warning}%` }}
                  />
                </div>
              </div>

              {healthStatus.critical > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-rose-500">Critical</span>
                    <span>{healthStatus.critical}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${healthStatus.critical}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}