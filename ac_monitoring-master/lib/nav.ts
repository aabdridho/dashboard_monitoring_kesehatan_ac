import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Activity,
  History,
  BarChart3,
  Settings,
} from "lucide-react";

/**
 * Single source of truth for the sidebar navigation.
 *
 * Route segments follow the App Router convention. The sidebar reads this
 * list directly; adding a new feature is a one-line edit here.
 */
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
    description: "Overview & live readings",
  },
  {
    label: "Monitoring",
    href: "/monitoring",
    icon: Activity,
    description: "Realtime sensor charts",
  },
  {
    label: "History",
    href: "/history",
    icon: History,
    description: "Past readings & exports",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Trends & averages",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Theme, alerts, Firebase",
  },
] as const;
