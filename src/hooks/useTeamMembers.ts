import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserDocument } from '../data/types';

export type TeamLeaderWithUid = UserDocument & { uid: string };

interface UseTeamMembersReturn {
  teamMembers: UserDocument[];
  teamLeaders: TeamLeaderWithUid[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for team leaders and admins to fetch team members
 * Team leaders: see employees assigned to them
 * Admins: see ALL employees across all teams + team leader info for grouping
 */
export function useTeamMembers(teamLeaderId: string | null, isAdmin = false): UseTeamMembersReturn {
  const [teamMembers, setTeamMembers] = useState<UserDocument[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderWithUid[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch employees
  useEffect(() => {
    if (!teamLeaderId && !isAdmin) {
      setTeamMembers([]);
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Admin: fetch ALL employees; Team leader: fetch only their team
    const usersRef = collection(db, 'users');
    const q = isAdmin
      ? query(usersRef, where('role', '==', 'employee'))
      : query(usersRef, where('teamLeaderId', '==', teamLeaderId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const members = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            uid: doc.id,
          } as UserDocument & { uid: string };
        });

        console.log('[useTeamMembers] Fetched team members:', {
          teamLeaderId,
          isAdmin,
          totalCount: members.length,
        });

        // Admin handles pending via level-up requests, not member approvals
        const pending = isAdmin ? 0 : members.filter(
          (m) => m.approvalStatus === 'pending' || m.plan?.planStatus === 'pending'
        ).length;
        setPendingCount(pending);

        // Sort: pending first, then by name
        members.sort((a, b) => {
          if (a.approvalStatus === 'pending' && b.approvalStatus !== 'pending') return -1;
          if (a.approvalStatus !== 'pending' && b.approvalStatus === 'pending') return 1;
          return a.displayName.localeCompare(b.displayName);
        });

        setTeamMembers(members as UserDocument[]);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useTeamMembers] Error fetching team members:', err);
        setError('Failed to load team members');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [teamLeaderId, isAdmin]);

  // Fetch team leaders (admin only) for grouping
  useEffect(() => {
    if (!isAdmin) {
      setTeamLeaders([]);
      return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'team_leader'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leaders = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            uid: doc.id,
          } as TeamLeaderWithUid;
        });

        console.log('[useTeamMembers] Fetched team leaders:', leaders.length);
        setTeamLeaders(leaders);
      },
      (err) => {
        console.error('[useTeamMembers] Error fetching team leaders:', err);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  return {
    teamMembers,
    teamLeaders,
    pendingCount,
    isLoading,
    error,
  };
}
