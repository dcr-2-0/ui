import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserDocument, UserRole, ApprovalStatus } from '../data/types';
import type { AuthUser } from './useAuth';
import { TEAM_LEADER_EMAILS, ADMIN_EMAILS } from '../data/teamLeaderEmails';

interface UseUserProfileReturn {
  profile: UserDocument | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserDocument>) => Promise<void>;
}

/**
 * Hook to manage user's profile data from Firestore
 * Listens to real-time updates and provides methods to update profile
 */
export function useUserProfile(user: AuthUser | null): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to real-time updates from Firestore
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const userDocRef = doc(db, 'users', user.email);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        console.log('[useUserProfile] Snapshot received:', {
          exists: docSnap.exists(),
          userId: user.uid,
        });

        if (docSnap.exists()) {
          const userData = docSnap.data() as UserDocument;
          console.log('[useUserProfile] Profile data:', {
            role: userData.role,
            approvalStatus: userData.approvalStatus,
            currentLevel: userData.currentLevel,
            teamLeaderId: userData.teamLeaderId,
          });

          // Repair: if the user's email is in the predefined admin list but
          // their Firestore document doesn't have role 'admin', upgrade them.
          if (ADMIN_EMAILS.includes(user.email) && userData.role !== 'admin') {
            const repairData = {
              role: 'admin' as UserRole,
              approvalStatus: 'approved' as ApprovalStatus,
              approvedAt: new Date().toISOString(),
            };
            setDoc(userDocRef, repairData, { merge: true }).catch((err) => {
              console.error('[useUserProfile] Error upgrading user to admin:', err);
            });
            setProfile({ ...userData, ...repairData } as UserDocument);
            setIsLoading(false);
            return;
          }

          // Repair: if the user's email is in the predefined team leader list but
          // their Firestore document has a different role, correct it.
          if (TEAM_LEADER_EMAILS.includes(user.email) && userData.role !== 'team_leader') {
            const repairData = {
              role: 'team_leader' as UserRole,
              approvalStatus: 'approved' as ApprovalStatus,
              approvedAt: new Date().toISOString(),
            };
            setDoc(userDocRef, repairData, { merge: true }).catch((err) => {
              console.error('[useUserProfile] Error upgrading employee to team_leader:', err);
            });
            setProfile({ ...userData, ...repairData } as UserDocument);
            setIsLoading(false);
            return;
          }

          // Backfill: if the doc is missing the `achieved` field (created before this feature),
          // add it so the user doesn't have to re-submit their profile setup.
          if (!userData.achieved) {
            setDoc(userDocRef, {
              achieved: { items: [], lastUpdated: new Date().toISOString() },
            }, { merge: true }).catch((err) => {
              console.error('[useUserProfile] Error backfilling achieved field:', err);
            });
          }

          setProfile(userData);
        } else {
          console.log('[useUserProfile] User document does not exist, creating with defaults');

          // Document doesn't exist yet - create user document
          const isPresetAdmin = ADMIN_EMAILS.includes(user.email);
          const isPresetTeamLeader = !isPresetAdmin && TEAM_LEADER_EMAILS.includes(user.email);
          const resolvedRole = (isPresetAdmin ? 'admin' : isPresetTeamLeader ? 'team_leader' : 'employee') as UserRole;
          const isAutoApproved = resolvedRole !== 'employee';

          const newUserDoc: UserDocument = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            role: resolvedRole,
            teamLeaderId: null,
            approvalStatus: (isAutoApproved ? 'approved' : 'pending') as ApprovalStatus,
            currentLevel: null,
            joinedCompanyAt: isAutoApproved ? new Date().toISOString() : null,
            approvedAt: isAutoApproved ? new Date().toISOString() : null,
            plan: {
              items: [],
              selectedLevelId: 0,
              lastUpdated: new Date().toISOString(),
            },
            achieved: {
              items: [],
              lastUpdated: new Date().toISOString(),
            },
          };

          console.log('[useUserProfile] Creating user document:', {
            uid: user.uid,
            role: newUserDoc.role,
            approvalStatus: newUserDoc.approvalStatus,
          });

          setDoc(userDocRef, newUserDoc).catch((err) => {
            console.error('[useUserProfile] ❌ Error creating user document:', err);
            console.error('[useUserProfile] ❌ This is likely due to Firestore security rules blocking writes');
            console.error('[useUserProfile] ❌ Deploy the firestore.rules file to fix this');
          });
          setProfile(newUserDoc);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('[useUserProfile] Error listening to user profile:', err);
        setError('Failed to load your profile');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Update profile fields
  const updateProfile = async (updates: Partial<UserDocument>): Promise<void> => {
    if (!user) {
      setError('You must be logged in to update your profile');
      throw new Error('Not authenticated');
    }

    try {
      const userDocRef = doc(db, 'users', user.email);
      console.log('[useUserProfile] Updating profile:', updates);

      await setDoc(userDocRef, updates, { merge: true });
      console.log('[useUserProfile] Profile updated successfully');
      setError(null);
    } catch (err) {
      console.error('[useUserProfile] Error updating profile:', err);
      setError('Failed to update your profile');
      throw err;
    }
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
  };
}
