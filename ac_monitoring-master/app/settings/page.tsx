
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

    // Dynamic import untuk test service
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

  // Timer untuk countdown 10 menit
  React.useEffect(() => {
    if (testStartTime === null) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - testStartTime;
      const tenMinutesMs = 10 * 60 * 1000;
      const remaining = Math.max(0, tenMinutesMs - elapsed);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Auto reset setelah 10 menit
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
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                <span>Dark Mode</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Enable or disable dark mode.
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
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="service-alerts" className="flex flex-col space-y-1">
                <span>Service Alerts</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive a notification when the AC status is &quot;Service Required&quot;.
                </span>
              </Label>
              <Switch id="service-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={isTestingActive ? "text-blue-600" : ""}>
              Fuzzy Logic Testing
              {isTestingActive && ` - ${formatTime(timeRemaining)}`}
            </CardTitle>
            <CardDescription>
              Test fuzzy logic conditions for AC health status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={testMode === "none" ? "default" : "outline"}
                onClick={() => setTestMode("none")}
                className="w-full"
              >
                Normal
              </Button>
              <Button
                variant={testMode === "healthy" ? "default" : "outline"}
                onClick={() => setTestMode("healthy")}
                className="w-full"
              >
                Healthy
              </Button>
              <Button
                variant={testMode === "warning" ? "default" : "outline"}
                onClick={() => setTestMode("warning")}
                className="w-full"
              >
                Warning
              </Button>
              <Button
                variant={testMode === "mixed" ? "default" : "outline"}
                onClick={() => setTestMode("mixed")}
                className="w-full"
              >
                Mixed (5s cycle)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isTestingActive
                ? `Testing condition: ${testMode} - Auto resets in ${formatTime(timeRemaining)}`
                : "Select a test condition to start"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firebase</CardTitle>
            <CardDescription>
              Firebase Realtime Database connection settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firebase-url">Database URL</Label>
              <Input
                id="firebase-url"
                placeholder="https://your-project-id.firebaseio.com"
                defaultValue="https://monitoring-kesehatan-ac-default-rtdb.firebaseio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firebase-secret">Service Account Key</Label>
              <Input
                id="firebase-secret"
                type="password"
                placeholder="Paste your service account JSON here"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}