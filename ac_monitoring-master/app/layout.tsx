import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { FirebaseAnalytics } from "@/components/firebase-analytics";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AC Monitoring — Premium AC Health Dashboard",
  description:
    "Soft, modern IoT dashboard for monitoring air conditioner health, sensor readings, and energy use in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <Suspense>
          <FirebaseAnalytics />
        </Suspense>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}