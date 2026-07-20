"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Wind } from "lucide-react";

import { cn } from "@/utils/cn";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Brand block at the top of the sidebar. Kept inline so the sidebar
 * composes one tidy tree (and so future logo swaps stay scoped here).
 */
function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 px-4 py-2"
      aria-label="AC Monitoring home"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Wind className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          AC Monitoring
        </span>
        <span className="text-[11px] text-muted-foreground">Health dashboard</span>
      </span>
    </Link>
  );
}

/**
 * One navigation row. The active item gets a soft primary tint and a
 * left-anchored rose dot for a subtle but clear focus state.
 */
function NavRow({
  href,
  label,
  icon: Icon,
  description,
  active,
  index,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  active: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: 0.05 + index * 0.04, ease: "easeOut" }}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
          active
            ? "bg-primary/15 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="flex flex-1 flex-col leading-tight">
          <span className="font-medium">{label}</span>
          {description ? (
            <span className="text-[11px] text-muted-foreground">{description}</span>
          ) : null}
        </span>
        {active ? (
          <span
            className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
            aria-hidden
          />
        ) : null}
      </Link>
    </motion.div>
  );
}

/**
 * Persistent (desktop) sidebar. Mobile uses `MobileSidebar` instead,
 * backed by Radix `Sheet`.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex md:w-[var(--sidebar-width)] md:flex-col",
        "sticky top-0 h-svh border-r border-border bg-background/80 backdrop-blur",
      )}
    >
      <div className="border-b border-border">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item, index) => (
          <NavRow
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            description={item.description}
            index={index}
            active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
          />
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">ESP32 — Online</p>
          <p className="mt-0.5">Last sync just now</p>
        </div>
      </div>
    </aside>
  );
}
