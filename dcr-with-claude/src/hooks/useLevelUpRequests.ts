import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { LevelUpRequest, CatalogItem } from '../data/types';

interface CreateLevelUpRequestData {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userPhotoURL: string | null;
  teamLeaderId: string;
  teamLeaderName: string;
  teamLeaderEmail: string;
  levelFrom: number;
  levelTo: number;
  quarter: string;
  completedItemKeys: string[];
  planItems: CatalogItem[];
}

interface UseLevelUpRequestsReturn {
  requests: LevelUpRequest[];
  isLoading: boolean;
  error: string | null;
  createRequest: (data: CreateLevelUpRequestData) => Promise<string>;
  approveRequest: (requestId: string, adminUid: string) => Promise<void>;
  rejectRequest: (requestId: string, adminUid: string, reason: string) => Promise<void>;
}

/**
 * Hook to manage level-up approval requests.
 *
 * isAdmin=true  → real-time listener on ALL pending requests (admin view)
 * isAdmin=false → real-time listener on requests for this teamLeaderId (TL history view)
 */
export function useLevelUpRequests(
  uid: string | null,
  isAdmin: boolean
): UseLevelUpRequestsReturn {
  const [requests, setRequests] = useState<LevelUpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    const requestsRef = collection(db, 'levelUpRequests');
    const q = isAdmin
      ? query(requestsRef)
      : query(requestsRef, where('teamLeaderId', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LevelUpRequest));
        data.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
        setRequests(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useLevelUpRequests] Error:', err);
        setError('Failed to load level-up requests');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, isAdmin]);

  const createRequest = async (data: CreateLevelUpRequestData): Promise<string> => {
    const docRef = await addDoc(collection(db, 'levelUpRequests'), {
      ...data,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });
    return docRef.id;
  };

  const approveRequest = async (requestId: string, adminUid: string): Promise<void> => {
    await updateDoc(doc(db, 'levelUpRequests', requestId), {
      status: 'approved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: adminUid,
    });
  };

  const rejectRequest = async (
    requestId: string,
    adminUid: string,
    reason: string
  ): Promise<void> => {
    await updateDoc(doc(db, 'levelUpRequests', requestId), {
      status: 'rejected',
      resolvedAt: new Date().toISOString(),
      resolvedBy: adminUid,
      rejectionReason: reason,
    });
  };

  return { requests, isLoading, error, createRequest, approveRequest, rejectRequest };
}
