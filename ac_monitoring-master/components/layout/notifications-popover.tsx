"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/lib/format";
import { useAlertsContext } from "@/hooks/use-alerts-context";

/**
 * Notifications popover anchored to the bell button in the top-nav.
 *
 * Shows the latest trips + recovery messages. Recoveries are styled as
 * success rows so the user can see at a glance that an issue cleared.
 */
export function NotificationsPopover() {
  const { alerts, unreadCount, dismiss, dismissAll, markAllRead } =
    useAlertsContext();
  const [open, setOpen] = React.useState(false);

  // When opening, the popover "consumes" all currently unread alerts —
  // they remain visible until dismissed, but the badge counter resets.
  // We do this in a layout effect so it doesn't re-fire on every render.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      markAllRead();
    }
    wasOpenRef.current = open;
  }, [open, markAllRead]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {alerts.length > 0 ? (
            <button
              type="button"
              onClick={dismissAll}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-[22rem] overflow-y-auto">
          {alerts.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence initial={false}>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-3 px-4 py-3">
                    {alert.message.startsWith("back to healthy") ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          alert.severity === "critical"
                            ? "text-destructive"
                            : "text-warning",
                        )}
                      />
                    )}
                    <div className="flex-1 leading-tight">
                      <p className="text-sm text-foreground">{alert.message}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatRelativeTime(alert.enteredAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(alert.id)}
                      className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">All clear</p>
      <p className="max-w-[14rem] text-xs text-muted-foreground">
        We&apos;ll let you know when a sensor reading goes out of range.
      </p>
    </div>
  );
}