import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserDocument } from '../data/types';

interface UseAllUsersReturn {
  users: UserDocument[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalUsers: number;
    employees: number;
    teamLeaders: number;
    admins: number;
    pendingApprovals: number;
  };
}

/**
 * Hook for admins to fetch all users in the system
 * Provides real-time updates and statistics
 */
export function useAllUsers(isAdmin: boolean): UseAllUsersReturn {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Query all users (admin privilege)
    const usersRef = collection(db, 'users');

    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const allUsers = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            uid: doc.id,
          } as UserDocument & { uid: string };
        });

        console.log('[useAllUsers] Fetched all users:', {
          totalCount: allUsers.length,
        });

        // Sort by role (admins, team leaders, employees) and then by name
        allUsers.sort((a, b) => {
          const roleOrder = { admin: 0, team_leader: 1, employee: 2 };
          const aOrder = roleOrder[a.role] ?? 3;
          const bOrder = roleOrder[b.role] ?? 3;

          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.displayName.localeCompare(b.displayName);
        });

        setUsers(allUsers as UserDocument[]);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useAllUsers] Error fetching users:', err);
        setError('Failed to load users');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    employees: users.filter((u) => u.role === 'employee').length,
    teamLeaders: users.filter((u) => u.role === 'team_leader').length,
    admins: users.filter((u) => u.role === 'admin').length,
    pendingApprovals: users.filter((u) => u.approvalStatus === 'pending').length,
  };

  return {
    users,
    isLoading,
    error,
    stats,
  };
}
