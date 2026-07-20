"use client";

import * as React from "react";
import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionPill } from "@/components/layout/connection-pill";

/**
 * Top navigation bar — search, notifications, user avatar.
 *
 * The hamburger button appears only on mobile and toggles the `MobileSidebar`.
 * Everything in this bar is in a sticky header that follows the soft-banner
 * pattern Apple/Linear use.
 */
export function TopNav({
  onMobileMenuClick,
}: {
  onMobileMenuClick: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-40 flex h-[var(--topnav-height)] items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open menu"
        onClick={onMobileMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative w-full max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder="Search readings, devices, settings…"
          aria-label="Search"
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">
          <ConnectionPill />
        </span>
      </div>
    </header>
  );
}
