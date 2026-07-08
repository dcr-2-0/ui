import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HR_EMAIL } from '../data/hrConfig';

/**
 * HR contact email — stored in `appConfig/main.hrEmail` (same doc as the
 * quarter lock) so admins can change it from the Settings tab without a
 * deploy. Falls back to the hardcoded default when unset.
 */
export function useHrEmail(): string {
  const [hrEmail, setHrEmail] = useState<string>(HR_EMAIL);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'appConfig', 'main'),
      (snap) => {
        const configured = snap.exists()
          ? (snap.data() as { hrEmail?: string }).hrEmail
          : undefined;
        setHrEmail(configured?.trim() ? configured.trim() : HR_EMAIL);
      },
      (err) => {
        console.error('[useHrEmail] Error reading config:', err);
        setHrEmail(HR_EMAIL);
      },
    );
    return () => unsubscribe();
  }, []);

  return hrEmail;
}

/** Admin action: persist a new HR email (empty string reverts to the default). */
export async function saveHrEmail(email: string): Promise<void> {
  await setDoc(
    doc(db, 'appConfig', 'main'),
    { hrEmail: email.trim() },
    { merge: true },
  );
}
