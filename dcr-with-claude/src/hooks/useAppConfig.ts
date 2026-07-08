import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UseAppConfigReturn {
  activeQuarter: string | null;
  loading: boolean;
  setActiveQuarter: (quarter: string | null) => Promise<void>;
}

/**
 * Real-time listener on the global app config document.
 * `activeQuarter` overrides calendar-based quarter detection when set.
 * If the document does not exist, falls back to null (calendar mode).
 */
export function useAppConfig(): UseAppConfigReturn {
  const [activeQuarter, setActiveQuarterState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'appConfig', 'main');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { activeQuarter?: string | null };
          setActiveQuarterState(data.activeQuarter ?? null);
        } else {
          setActiveQuarterState(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useAppConfig] Error listening to app config:', err);
        setActiveQuarterState(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const setActiveQuarter = async (quarter: string | null) => {
    const ref = doc(db, 'appConfig', 'main');
    await setDoc(ref, { activeQuarter: quarter }, { merge: true });
  };

  return { activeQuarter, loading, setActiveQuarter };
}
