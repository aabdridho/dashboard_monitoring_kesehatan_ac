"use client";

import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

/**
 * Firebase client singleton.
 *
 * Reads from `NEXT_PUBLIC_FIREBASE_*` env vars. When those are absent (i.e.
 * local dev without secrets), `isFirebaseConfigured()` returns false and
 * the realtime hook falls back to `mockService` so the dashboard still
 * renders realistic data instead of an empty screen.
 *
 * `getFirebaseApp()` is idempotent — Next.js dev re-evaluates modules on
 * hot-reload, so we guard against double-init.
 */

interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

function hasRealValue(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.includes("your_") && !value.includes("placeholder") && !value.includes("<") && !value.includes("demo"));
}

function normalizeDatabaseUrl(value: string | undefined): string | undefined {
  if (!hasRealValue(value)) return undefined;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/u, "")}`;
}

function readEnv(): FirebaseEnv | null {
  // `process.env.NEXT_PUBLIC_*` is inlined by Next at build time and is
  // therefore safe to read in the browser bundle.
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const databaseURL = normalizeDatabaseUrl(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!hasRealValue(apiKey) || !hasRealValue(databaseURL) || !hasRealValue(projectId)) return null;

  return {
    apiKey,
    authDomain:
      hasRealValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
        ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!
        : `${projectId}.firebaseapp.com`,
    databaseURL,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: hasRealValue(appId) ? appId : undefined,
  };
}

export function isFirebaseConfigured(): boolean {
  return readEnv() !== null;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  const env = readEnv();
  if (!env) {
    throw new Error(
      "Firebase env vars are missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local.",
    );
  }
  cachedApp = getApps()[0] ?? initializeApp(env);
  return cachedApp;
}

export function getFirebaseDatabase(): Database {
  if (cachedDb) return cachedDb;
  cachedDb = getDatabase(getFirebaseApp());
  return cachedDb;
}

/**
 * Firebase Realtime Database paths used across the app.
 * Centralised so a future migration (e.g. to a different root node) is a
 * one-line edit.
 */
export const FIREBASE_PATHS = {
  ac: "AC",
  indoor: "Indoor",
  kwh: "KWHMeter",
  outdoor: "Outdoor",
  history: "sensors/history",
} as const;