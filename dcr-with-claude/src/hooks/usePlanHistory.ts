import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PlanHistoryEntry } from '../data/types';

interface UsePlanHistoryReturn {
  planHistory: PlanHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Real-time listener for a user's plan history subcollection.
 * Returns all past quarterly plan snapshots, sorted most-recent-first.
 */
export function usePlanHistory(userId: string | null): UsePlanHistoryReturn {
  const [planHistory, setPlanHistory] = useState<PlanHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPlanHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const userDocRef = doc(db, 'users', userId);
    const historyRef = collection(userDocRef, 'planHistory');
    const q = query(historyRef, orderBy('submittedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const entries: PlanHistoryEntry[] = snap.docs.map((d) => d.data() as PlanHistoryEntry);
        setPlanHistory(entries);
        setIsLoading(false);
      },
      (err) => {
        console.error('[usePlanHistory] Error loading plan history:', err);
        setError('Failed to load plan history');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { planHistory, isLoading, error };
}
