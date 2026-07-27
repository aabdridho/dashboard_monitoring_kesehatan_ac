"use client";

import * as React from "react";
import { query, ref, orderByKey, limitToLast, onValue } from "firebase/database";
import { getFirebaseDatabase, isFirebaseConfigured, FIREBASE_PATHS } from "@/services/firebase";
import type { SensorReading } from "@/types/sensor";

export function useFirebaseHistory(limit: number = 1000) {
  const [history, setHistory] = React.useState<SensorReading[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const db = getFirebaseDatabase();
    const historyRef = ref(db, FIREBASE_PATHS.history);
    const q = query(historyRef, orderByKey(), limitToLast(limit));

    const unsubscribe = onValue(q, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Convert to array and parse
        const arr = Object.values(data) as any[];
        const typedArr: SensorReading[] = arr.map((item) => {
          // If the structure is different, it will be mapped correctly if needed.
          // In standard cases, it matches SensorReading.
          return {
            ...item,
            timestamp: item.timestamp ?? Date.now(),
          } as SensorReading;
        });

        // Ensure chronological order
        typedArr.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
        setHistory(typedArr);
      } else {
        setHistory([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limit]);

  return { history, loading };
}
