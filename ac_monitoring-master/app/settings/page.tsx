"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TestCondition } from "@/services/test-sensor-service";

const THEME_STORAGE_KEY = "ac-monitoring-theme";
const TEST_MODE_STORAGE_KEY = "ac-monitoring-test-mode";

function readInitialTheme(): boolean {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readInitialTestMode(): TestCondition {
  if (typeof window === "undefined") return "none";
  return (window.localStorage.getItem(TEST_MODE_STORAGE_KEY) as TestCondition) || "none";
}

export default function SettingsPage() {
  const [isDarkMode, setIsDarkMode] = React.useState(() => readInitialTheme());
  const [testMode, setTestMode] = React.useState<TestCondition>(() => readInitialTestMode());
  const [testStartTime, setTestStartTime] = React.useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<number>(0);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  React.useEffect(() => {
    window.localStorage.setItem(TEST_MODE_STORAGE_KEY, testMode);
    window.dispatchEvent(new Event("storage"));

    (async () => {
      const { getTestSensorService } = await import("@/services/test-sensor-service");
      const service = getTestSensorService();

      if (testMode !== "none") {
        service.setCondition(testMode);
        setTestStartTime(Date.now());
      } else {
        service.reset();
        setTestStartTime(null);
      }
    })();
  }, [testMode]);

  React.useEffect(() => {
    if (testStartTime === null) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - testStartTime;
      const tenMinutesMs = 10 * 60 * 1000;
      const remaining = Math.max(0, tenMinutesMs - elapsed);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        setTestMode("none");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testStartTime]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const isTestingActive = testMode !== "none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola preferensi aplikasi, notifikasi, dan pengujian simulasi logika fuzzy.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>
              Kustomisasi tema tampilan aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                <span>Mode Gelap (Dark Mode)</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Aktifkan atau nonaktifkan mode gelap.
                </span>
              </Label>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={(checked) => setIsDarkMode(Boolean(checked))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>
              Pengaturan pemberitahuan peringatan layanan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="service-alerts" className="flex flex-col space-y-1">
                <span>Peringatan Layanan</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Terima notifikasi ketika status AC membutuhkan perawatan.
                </span>
              </Label>
              <Switch id="service-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={isTestingActive ? "text-blue-600 dark:text-blue-400" : ""}>
              Pengujian Logika Fuzzy
              {isTestingActive && ` - ${formatTime(timeRemaining)}`}
            </CardTitle>
            <CardDescription>
              Uji kondisi simulasi logika fuzzy untuk status kesehatan AC secara real-time dan global di seluruh halaman aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={testMode === "none" ? "default" : "outline"}
                onClick={() => setTestMode("none")}
                className="w-full"
              >
                Normal (Data Asli)
              </Button>
              <Button
                variant={testMode === "healthy" ? "default" : "outline"}
                onClick={() => setTestMode("healthy")}
                className="w-full"
              >
                Sehat (Healthy)
              </Button>
              <Button
                variant={testMode === "warning" ? "default" : "outline"}
                onClick={() => setTestMode("warning")}
                className="w-full"
              >
                Peringatan (Warning)
              </Button>
              <Button
                variant={testMode === "mixed" ? "default" : "outline"}
                onClick={() => setTestMode("mixed")}
                className="w-full"
              >
                Campuran (Berganti 5s)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isTestingActive
                ? `Kondisi pengujian aktif: ${testMode} - Otomatis kembali ke data asli dalam ${formatTime(timeRemaining)}`
                : "Pilih kondisi pengujian untuk memulai simulasi"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Firebase</CardTitle>
            <CardDescription>
              Pengaturan koneksi Firebase Realtime Database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firebase-url">URL Database</Label>
              <Input
                id="firebase-url"
                placeholder="https://your-project-id.firebaseio.com"
                defaultValue="https://monitoring-kesehatan-ac-default-rtdb.firebaseio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firebase-secret">Kunci Akun Layanan (Service Account Key)</Label>
              <Input
                id="firebase-secret"
                type="password"
                placeholder="Paste kunci akun layanan JSON Anda di sini"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Simpan Perubahan</Button>
        </div>
      </div>
    </div>
  );
}