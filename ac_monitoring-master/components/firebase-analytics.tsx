"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isFirebaseConfigured } from "@/services/firebase";

export function FirebaseAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !isFirebaseConfigured()) return;

    // Firebase Analytics can trigger Installation API requests. Those are not
    // required for this dashboard and may fail under a project that doesn't
    // have the required service enabled. We therefore skip analytics init here
    // and keep the app focused on Realtime Database functionality.
  }, [pathname]);

  return null;
}
