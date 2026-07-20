"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wind } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/utils/cn";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Mobile sidebar — a Radix `Sheet` slide-in from the left.
 * State is lifted so external triggers (the top-nav hamburger) can open it.
 */
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>
            <Link
              href="/"
              className="flex items-center gap-2.5"
              onClick={() => onOpenChange(false)}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <Wind className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">AC Monitoring</span>
                <span className="text-[11px] text-muted-foreground">Health dashboard</span>
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">ESP32 — Online</p>
            <p className="mt-0.5">Last sync just now</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
