import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TeamLeader {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

/**
 * Fetches all users with role === 'team_leader' from Firestore in real time.
 */
export function useTeamLeaders() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'team_leader'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leaders = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName as string,
            email: data.email as string,
            photoURL: (data.photoURL as string | null) ?? null,
          };
        });

        leaders.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setTeamLeaders(leaders);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useTeamLeaders] Error fetching team leaders:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { teamLeaders, isLoading };
}
