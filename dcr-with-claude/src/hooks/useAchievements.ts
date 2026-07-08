import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Achievement, CatalogItem, AchievementStatus, AchievementType } from '../data/types';

const MAX_PROOF_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_PROOF_TYPES = 'image/*,application/pdf,text/plain';

export { ACCEPTED_PROOF_TYPES };

/**
 * Upload a proof file for an achievement to Firebase Storage.
 * Returns the download URL (to be stored as proofLink).
 * Throws if the file is too large or upload fails.
 */
export async function uploadAchievementProofFile(
  userId: string,
  itemId: string,
  file: File
): Promise<{ fileUrl: string; filePath: string; fileName: string }> {
  if (file.size > MAX_PROOF_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5 MB.');
  }
  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `achievementProofs/${userId}/${itemId}/${uuid}-${safeName}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(snapshot.ref);
  return { fileUrl, filePath: path, fileName: file.name };
}

/**
 * Delete an achievement proof file from Firebase Storage (best-effort).
 */
export async function deleteAchievementProofFile(filePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, filePath));
  } catch {
    // best-effort — file may already be gone
  }
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  isLoading: boolean;
  error: string | null;
  addAchievement: (data: NewAchievementData) => Promise<void>;
  updateAchievement: (id: string, updates: Partial<Achievement>) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;
}

export interface NewAchievementData {
  itemId: string;
  item: CatalogItem;
  completionDate: string;
  proofLink: string;
  notes?: string;
  type?: AchievementType;
  quarter?: string | null;
}

/**
 * Hook to manage user achievements in Firestore
 * Provides CRUD operations and real-time listening
 */
export function useAchievements(userId: string | null): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to real-time updates for user's achievements
  useEffect(() => {
    if (!userId) {
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Query achievements for this user
    const achievementsRef = collection(db, 'achievements');
    const q = query(achievementsRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Achievement[];

        console.log('[useAchievements] Fetched achievements:', {
          userId,
          count: items.length,
        });

        // Sort by completion date (newest first)
        items.sort((a, b) =>
          new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()
        );

        setAchievements(items);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useAchievements] Error fetching achievements:', err);
        setError('Failed to load achievements');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Add new achievement
  const addAchievement = useCallback(
    async (data: NewAchievementData): Promise<void> => {
      if (!userId) {
        throw new Error('You must be logged in to add achievements');
      }

      try {
        const achievementsRef = collection(db, 'achievements');
        const now = new Date().toISOString();

        const newAchievement: Omit<Achievement, 'id'> = {
          userId,
          itemId: data.itemId,
          item: data.item,
          status: 'historical' as AchievementStatus, // Default for new achievements
          type: data.type || ('historical' as AchievementType),
          completionDate: data.completionDate,
          quarter: data.quarter || null,
          proofLink: data.proofLink,
          notes: data.notes || '',
          submittedAt: null,
          approvedAt: null,
          approvedBy: null,
          rejectionReason: null,
          createdAt: now,
          updatedAt: now,
        };

        console.log('[useAchievements] Adding achievement:', {
          userId,
          itemId: data.itemId,
          type: newAchievement.type,
        });

        await addDoc(achievementsRef, newAchievement);
        console.log('[useAchievements] Achievement added successfully');
        setError(null);
      } catch (err) {
        console.error('[useAchievements] Error adding achievement:', err);
        setError('Failed to add achievement');
        throw err;
      }
    },
    [userId]
  );

  // Update existing achievement
  const updateAchievement = useCallback(
    async (id: string, updates: Partial<Achievement>): Promise<void> => {
      try {
        const achievementRef = doc(db, 'achievements', id);
        const updatedData = {
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        console.log('[useAchievements] Updating achievement:', {
          id,
          updates: Object.keys(updates),
        });

        await updateDoc(achievementRef, updatedData);
        console.log('[useAchievements] Achievement updated successfully');
        setError(null);
      } catch (err) {
        console.error('[useAchievements] Error updating achievement:', err);
        setError('Failed to update achievement');
        throw err;
      }
    },
    []
  );

  // Delete achievement
  const deleteAchievement = useCallback(async (id: string): Promise<void> => {
    try {
      const achievementRef = doc(db, 'achievements', id);
      console.log('[useAchievements] Deleting achievement:', id);

      await deleteDoc(achievementRef);
      console.log('[useAchievements] Achievement deleted successfully');
      setError(null);
    } catch (err) {
      console.error('[useAchievements] Error deleting achievement:', err);
      setError('Failed to delete achievement');
      throw err;
    }
  }, []);

  return {
    achievements,
    isLoading,
    error,
    addAchievement,
    updateAchievement,
    deleteAchievement,
  };
}
