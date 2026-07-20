"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useRealtimeContext } from "@/hooks/use-realtime-context";
import type { DeviceStatus, SensorReading } from "@/types/sensor";

const PAGE_SIZE = 100;
const MAX_HISTORY_ENTRIES = 1000;

const HEALTH_SCORE_BY_STATUS: Record<DeviceStatus | "offline", number> = {
  healthy: 95,
  warning: 78,
  critical: 54,
  offline: 0,
};

const STATUS_STYLES: Record<DeviceStatus | "offline", string> = {
  healthy: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
  offline: "bg-slate-100 text-slate-800",
};

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatStatusLabel(status: DeviceStatus | undefined) {
  if (!status) return "Offline";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function HistoryPage() {
  const { reading } = useRealtimeContext();
  const [history, setHistory] = React.useState<SensorReading[]>([]);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    if (!reading) return;

    setHistory((prev) => {
      const next = [
        ...prev,
        {
          ...reading,
          __historyKey: `${reading.timestamp ?? Date.now()}-${prev.length}`,
        },
      ] as SensorReading[];
      return next.length > MAX_HISTORY_ENTRIES
        ? next.slice(next.length - MAX_HISTORY_ENTRIES)
        : next;
    });
  }, [reading]);

  React.useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [history.length, page]);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const pageData = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return [...history].reverse().slice(start, start + PAGE_SIZE);
  }, [history, page]);

  const handleExport = () => {
    const rows = pageData.map((entry) => ({
      timestamp: formatTimestamp(entry.timestamp),
      indoor_temp: `${entry.indoor_temp.toFixed(1)}°C`,
      outdoor_temp: `${entry.outdoor_temp.toFixed(1)}°C`,
      supply_temp: `${entry.supply_temp.toFixed(1)}°C`,
      power: entry.power,
      health_score: HEALTH_SCORE_BY_STATUS[entry.status ?? "offline"],
      status: formatStatusLabel(entry.status),
    }));

    const csv = [
      [
        "Timestamp",
        "Indoor Temp",
        "Outdoor Temp",
        "Supply Temp",
        "Power (W)",
        "Health Score",
        "Status",
      ].join(","),
      ...rows.map((row) =>
        [
          row.timestamp,
          row.indoor_temp,
          row.outdoor_temp,
          row.supply_temp,
          row.power,
          row.health_score,
          row.status,
        ]
          .map((value) => String(value).replace(/"/g, '""'))
          .map((value) => `"${value}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `history-page-${page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground">
            Live telemetry history with the latest sensor readings and pagination.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExport} disabled={history.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            <span>{history.length} total rows</span>
            <span>
              Page {page} / {totalPages}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Indoor Temp.</TableHead>
              <TableHead className="text-right">Outdoor Temp.</TableHead>
              <TableHead className="text-right">Supply Temp.</TableHead>
              <TableHead className="text-right">Power (W)</TableHead>
              <TableHead className="text-right">Health Score</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((row, index) => (
              <TableRow key={(row as SensorReading & { __historyKey?: string }).__historyKey ?? `${row.timestamp}-${index}`}>
                <TableCell className="font-medium">
                  {formatTimestamp(row.timestamp)}
                </TableCell>
                <TableCell className="text-right">
                  {row.indoor_temp.toFixed(1)}°C
                </TableCell>
                <TableCell className="text-right">
                  {row.outdoor_temp.toFixed(1)}°C
                </TableCell>
                <TableCell className="text-right">
                  {row.supply_temp.toFixed(1)}°C
                </TableCell>
                <TableCell className="text-right">{row.power}</TableCell>
                <TableCell className="text-right">
                  {HEALTH_SCORE_BY_STATUS[row.status ?? "offline"]}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[row.status ?? "offline"]
                    }`}
                  >
                    {formatStatusLabel(row.status)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <p>
          Showing {pageData.length} rows of {history.length} total recent readings.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
