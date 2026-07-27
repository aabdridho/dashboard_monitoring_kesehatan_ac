import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Activity,
  History,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Ringkasan & data sensor",
  },
  {
    label: "Monitoring",
    href: "/monitoring",
    icon: Activity,
    description: "Grafik sensor real-time",
  },
  {
    label: "Riwayat",
    href: "/history",
    icon: History,
    description: "Riwayat data & ekspor",
  },
  {
    label: "Analitik",
    href: "/analytics",
    icon: BarChart3,
    description: "Statistik & rata-rata",
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: Settings,
    description: "Simulasi & preferensi",
  },
] as const;
