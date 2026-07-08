import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { CatalogItem, PlanStatus, CompletionStatus, ProofEntry, PlanHistoryEntry } from '../data/types';
import { levels, MANDATORY_ITEM_IDS } from '../data/levels';
import type { AuthUser } from './useAuth';


interface UserPlan {
  items: CatalogItem[];
  selectedLevelId: number;
  lastUpdated: string;
  planStatus?: PlanStatus;
  planSubmittedAt?: string;
  planApprovedAt?: string;
  planRejectionReason?: string;
  quarter?: string;
  proofEntries?: Record<string, ProofEntry[]>;
  levelAchievedOnApproval?: number | null;
  completedItemKeys?: string[];
  completionStatus?: CompletionStatus;
  completionSubmittedAt?: string;
  completionRejectionReason?: string;
  carriedItems?: CatalogItem[];
  carriedFromQuarter?: string;
}

interface UseUserPlanReturn {
  items: CatalogItem[];
  selectedLevelId: number;
  planStatus: PlanStatus | undefined;
  planSubmittedAt: string | undefined;
  planRejectionReason: string | undefined;
  proofEntries: Record<string, ProofEntry[]>;
  uploadingItemIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  addItem: (item: CatalogItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setSelectedLevel: (levelId: number) => Promise<void>;
  toggleItem: (item: CatalogItem) => Promise<void>;
  isInCart: (itemId: string) => boolean;
  getQuantity: (itemId: string) => number;
  totalPoints: number;
  totalItems: number;
  submitPlan: (carryOverPoints?: number) => Promise<void>;
  withdrawPlan: () => Promise<void>;
  withdrawApproval: () => Promise<void>;
  addProof: (itemId: string, proof: ProofEntry) => Promise<void>;
  deleteProof: (itemId: string, proofId: string) => Promise<void>;
  uploadFileProof: (itemId: string, file: File) => Promise<void>;
  // Completion review
  completedItemKeys: string[];
  completionStatus: CompletionStatus | undefined;
  completionSubmittedAt: string | undefined;
  completionRejectionReason: string | undefined;
  completedItems: CatalogItem[];
  completionRequirementsMet: boolean;
  completionShortfalls: string[];
  toggleItemComplete: (itemKey: string) => Promise<void>;
  submitCompletedPlan: () => Promise<void>;
  withdrawCompletedPlan: () => Promise<void>;
  // Quarter-end carryover
  carriedItems: CatalogItem[];
  carriedFromQuarter: string | undefined;
  carriedPoints: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Hook to manage user's real plan stored in Firestore
 * Only works for authenticated users
 */
export function useUserPlan(user: AuthUser | null, currentQuarter: string): UseUserPlanReturn {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedLevelId, setSelectedLevelIdState] = useState<number>(0);
  const [planStatus, setPlanStatus] = useState<PlanStatus | undefined>(undefined);
  const [planSubmittedAt, setPlanSubmittedAt] = useState<string | undefined>(undefined);
  const [planRejectionReason, setPlanRejectionReason] = useState<string | undefined>(undefined);
  const [proofEntries, setProofEntries] = useState<Record<string, ProofEntry[]>>({});
  const [uploadingItemIds, setUploadingItemIds] = useState<Set<string>>(new Set());
  const [completedItemKeys, setCompletedItemKeys] = useState<string[]>([]);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | undefined>(undefined);
  const [completionSubmittedAt, setCompletionSubmittedAt] = useState<string | undefined>(undefined);
  const [completionRejectionReason, setCompletionRejectionReason] = useState<string | undefined>(undefined);
  const [carriedItems, setCarriedItems] = useState<CatalogItem[]>([]);
  const [carriedFromQuarter, setCarriedFromQuarter] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to real-time updates from Firestore
  useEffect(() => {
    if (!user) {
      setItems([]);
      setSelectedLevelIdState(0);
      setPlanStatus(undefined);
      setPlanSubmittedAt(undefined);
      setPlanRejectionReason(undefined);
      setProofEntries({});
      setCompletedItemKeys([]);
      setCompletionStatus(undefined);
      setCompletionSubmittedAt(undefined);
      setCompletionRejectionReason(undefined);
      setCarriedItems([]);
      setCarriedFromQuarter(undefined);
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
        console.log('[useUserPlan] Snapshot received:', {
          exists: docSnap.exists(),
          userId: user.uid,
        });
        if (docSnap.exists()) {
          const userData = docSnap.data() as { plan?: UserPlan };
          const plan = userData.plan || { items: [], selectedLevelId: 0, lastUpdated: new Date().toISOString() };

          // Defensive checks
          const safeItems: CatalogItem[] = Array.isArray(plan.items) ? plan.items : [];
          const levelId = typeof plan.selectedLevelId === 'number' ? plan.selectedLevelId : 0;

          console.log('[useUserPlan] Snapshot data:', {
            itemCount: safeItems.length,
            levelId,
            itemIds: safeItems.map((i: CatalogItem) => i.id),
            lastUpdated: plan.lastUpdated,
            planStatus: plan.planStatus,
          });

          // Quarter-end carryover: when a new quarter starts and the employee didn't level up,
          // items they marked as done carry forward as locked pre-completed items.
          // The plan resets to draft so the TL must re-approve for the new quarter.
          const isNewQuarter = plan.quarter && plan.quarter !== currentQuarter;
          const noLevelUp = !plan.levelAchievedOnApproval;

          // Level-up was approved last quarter — start completely fresh, no carryover
          if (isNewQuarter && !noLevelUp) {
            console.log('[useUserPlan] New quarter detected after level-up — resetting to empty plan');
            updateDoc(userDocRef, {
              'plan.items': [],
              'plan.carriedItems': [],
              'plan.carriedFromQuarter': null,
              'plan.planStatus': 'draft',
              'plan.planSubmittedAt': null,
              'plan.planApprovedAt': null,
              'plan.planRejectionReason': null,
              'plan.quarter': null,
              'plan.levelAchievedOnApproval': null,
              'plan.proofEntries': {},
              'plan.completedItemKeys': [],
              'plan.completionStatus': null,
              'plan.completionSubmittedAt': null,
              'plan.completionRejectionReason': null,
              'plan.lastUpdated': new Date().toISOString(),
            }).catch((e) => console.error('[useUserPlan] Failed to reset plan after level-up:', e));
            setIsLoading(false);
            return;
          }

          if (isNewQuarter && noLevelUp) {
            const prevItems: CatalogItem[] = Array.isArray(plan.items) ? plan.items : [];
            const prevKeys: string[] = Array.isArray(plan.completedItemKeys) ? plan.completedItemKeys : [];
            const prevCarried: CatalogItem[] = Array.isArray(plan.carriedItems) ? plan.carriedItems : [];

            // Items marked done this quarter → become the new locked carriedItems
            // Items NOT marked done → stay in items[] for the employee to modify
            // Mandatory items are per-quarter and always reset — never carried forward
            const newCarriedItems = prevItems.filter((item, idx) => {
              const key = item.planItemKey ?? `${item.id}-${idx}`;
              return !MANDATORY_ITEM_IDS.includes(item.id) && prevKeys.includes(key);
            });
            const remainingItems = prevItems.filter((item, idx) => {
              const key = item.planItemKey ?? `${item.id}-${idx}`;
              return !MANDATORY_ITEM_IDS.includes(item.id) && !prevKeys.includes(key);
            });

            // Merge with any items already carried from an earlier quarter (multi-quarter accumulation)
            const mergedCarried = [
              ...prevCarried.filter((ci) => !newCarriedItems.some((ni) => ni.id === ci.id)),
              ...newCarriedItems,
            ];

            console.log('[useUserPlan] New quarter detected with no level-up — carrying', mergedCarried.length, 'items forward to draft');
            updateDoc(userDocRef, {
              'plan.items': remainingItems,
              'plan.carriedItems': mergedCarried,
              'plan.carriedFromQuarter': plan.quarter,
              'plan.planStatus': 'draft',
              'plan.planSubmittedAt': null,
              'plan.planApprovedAt': null,
              'plan.planRejectionReason': null,
              'plan.quarter': null,
              'plan.levelAchievedOnApproval': null,
              'plan.proofEntries': {},
              'plan.completedItemKeys': [],
              'plan.completionStatus': null,
              'plan.completionSubmittedAt': null,
              'plan.completionRejectionReason': null,
              'plan.lastUpdated': new Date().toISOString(),
            }).catch((e) => console.error('[useUserPlan] Failed to reset plan for new quarter:', e));
            // Don't set local state — next snapshot will reflect the reset
            setIsLoading(false);
            return;
          }

          setItems(safeItems);
          setSelectedLevelIdState(levelId);
          setPlanStatus(plan.planStatus);
          setPlanSubmittedAt(plan.planSubmittedAt);
          setPlanRejectionReason(plan.planRejectionReason);
          setProofEntries(plan.proofEntries ?? {});
          setCompletedItemKeys(plan.completedItemKeys ?? []);
          setCompletionStatus(plan.completionStatus);
          setCompletionSubmittedAt(plan.completionSubmittedAt);
          setCompletionRejectionReason(plan.completionRejectionReason);
          setCarriedItems(Array.isArray(plan.carriedItems) ? plan.carriedItems : []);
          setCarriedFromQuarter(plan.carriedFromQuarter);
        } else {
          // Don't create the document here - useUserProfile handles document creation.
          // The onSnapshot listener will fire again once the document is created.
          console.log('[useUserPlan] User document does not exist yet, waiting for useUserProfile to create it');
          setItems([]);
          setSelectedLevelIdState(0);
          setPlanStatus(undefined);
          setPlanSubmittedAt(undefined);
          setPlanRejectionReason(undefined);
          setProofEntries({});
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('[useUserPlan] Error listening to user plan:', err);
        setError('Failed to load your plan');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, currentQuarter]);

  // Save plan to Firestore
  // Auto-resets planStatus to 'draft' when items change on an approved/rejected plan.
  // Never writes undefined values to Firestore (Firebase rejects them in nested maps).
  const savePlan = useCallback(
    async (newItems: CatalogItem[], levelId?: number) => {
      if (!user) {
        setError('You must be logged in to save your plan');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.email);

        // Auto-reset: changing items on a pending/approved/rejected plan reverts it to draft
        const effectiveStatus: PlanStatus | undefined =
          planStatus === 'pending' || planStatus === 'approved' || planStatus === 'rejected' ? 'draft' : planStatus;

        // Build plan data without undefined values — Firebase throws on undefined in nested maps
        const planData: Record<string, unknown> = {
          items: newItems,
          selectedLevelId: levelId !== undefined ? levelId : selectedLevelId,
          lastUpdated: new Date().toISOString(),
        };
        if (effectiveStatus != null) {
          planData.planStatus = effectiveStatus;
        }
        // Only carry over submission/rejection metadata when NOT resetting to draft
        if (effectiveStatus !== 'draft' && effectiveStatus != null) {
          if (planSubmittedAt != null) planData.planSubmittedAt = planSubmittedAt;
          if (planRejectionReason != null) planData.planRejectionReason = planRejectionReason;
        }
        // Always preserve proof entries across item saves
        if (Object.keys(proofEntries).length > 0) {
          planData.proofEntries = proofEntries;
        }
        // Always persist carried items so they survive item edits
        if (carriedItems.length > 0) {
          planData.carriedItems = carriedItems;
        }
        if (carriedFromQuarter != null) {
          planData.carriedFromQuarter = carriedFromQuarter;
        }
        // Reset completion data when reverting to draft (items changed invalidates completion)
        if (effectiveStatus === 'draft') {
          planData.completedItemKeys = [];
          planData.completionStatus = null;
          planData.completionSubmittedAt = null;
          planData.completionRejectionReason = null;
        } else {
          // Preserve completion state when not resetting
          if (completedItemKeys.length > 0) planData.completedItemKeys = completedItemKeys;
          if (completionStatus != null) planData.completionStatus = completionStatus;
          if (completionSubmittedAt != null) planData.completionSubmittedAt = completionSubmittedAt;
          if (completionRejectionReason != null) planData.completionRejectionReason = completionRejectionReason;
        }

        console.log('[useUserPlan] Saving plan to Firestore:', {
          userId: user.uid,
          itemCount: newItems.length,
          itemIds: newItems.map(i => i.id),
          selectedLevelId: planData.selectedLevelId,
          planStatus: effectiveStatus,
        });

        // Update only the plan field, merge with existing user data
        await setDoc(userDocRef, { plan: planData }, { merge: true });
        console.log('[useUserPlan] Plan saved successfully to Firestore');
        setError(null);
      } catch (err) {
        console.error('[useUserPlan] Error saving plan:', err);
        setError('Failed to save your plan');
        throw err;
      }
    },
    [user, selectedLevelId, planStatus, planSubmittedAt, planRejectionReason, proofEntries, completedItemKeys, completionStatus, completionSubmittedAt, completionRejectionReason, carriedItems, carriedFromQuarter]
  );

  /**
   * Save proof entries using a field-level update so we never wipe other plan fields.
   * This does NOT reset planStatus — proof changes are independent of plan approval state.
   */
  const saveProofEntries = useCallback(
    async (entries: Record<string, ProofEntry[]>) => {
      if (!user) return;
      try {
        const userDocRef = doc(db, 'users', user.email);
        await updateDoc(userDocRef, { 'plan.proofEntries': entries });
      } catch (err) {
        console.error('[useUserPlan] Error saving proof entries:', err);
        throw err;
      }
    },
    [user]
  );

  const confirmReapproval = () =>
    window.confirm(
      'Your plan has already been approved by your team leader.\n\n' +
      'Changing items will invalidate the current approval — ' +
      'the plan will revert to draft and must be re-submitted for re-approval before it can be used.\n\n' +
      'Do you want to continue?'
    );

  const confirmWithdraw = () =>
    window.confirm(
      'Your plan is currently pending approval.\n\n' +
      'Making changes will withdraw it from review and reset it to draft — ' +
      'you will need to re-submit it for approval.\n\n' +
      'Do you want to withdraw and continue?'
    );

  const addItem = useCallback(
    async (item: CatalogItem) => {
      if (planStatus === 'pending' && !confirmWithdraw()) return;
      if (planStatus === 'approved' && !confirmReapproval()) return;
      // Non-repeatable items already in carriedItems cannot be added again
      if (!item.repeatable && carriedItems.some((ci) => ci.id === item.id)) {
        console.log('[useUserPlan] Item already carried from previous quarter, skipping add');
        return;
      }
      // Optimistic update: update local state immediately
      setItems((prevItems) => {
        // Non-repeatable: prevent duplicates
        if (!item.repeatable && prevItems.some((i) => i.id === item.id)) {
          console.log('[useUserPlan] Item already in cart, skipping add');
          return prevItems;
        }
        // Assign a unique key per occurrence (stable across saves/reloads)
        const itemWithKey = { ...item, planItemKey: item.planItemKey ?? crypto.randomUUID() };
        const newItems = [...prevItems, itemWithKey];
        console.log('[useUserPlan] Optimistically added item:', item.id, '| Total items:', newItems.length);
        // Sync to Firestore in background
        savePlan(newItems).catch((err) => {
          console.error('[useUserPlan] Failed to sync add to Firestore:', err);
          // Revert optimistic update on error
          setItems(prevItems);
        });
        return newItems;
      });
    },
    [savePlan, planStatus, carriedItems]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (planStatus === 'pending' && !confirmWithdraw()) return;
      if (planStatus === 'approved' && !confirmReapproval()) return;
      // Optimistic update: update local state immediately
      setItems((prevItems) => {
        // Remove last occurrence only (correct for repeatable items)
        const idx = [...prevItems].reverse().findIndex((i) => i.id === itemId);
        if (idx === -1) return prevItems;
        const realIdx = prevItems.length - 1 - idx;
        const newItems = [...prevItems.slice(0, realIdx), ...prevItems.slice(realIdx + 1)];
        console.log('[useUserPlan] Optimistically removed item:', itemId, '| Total items:', newItems.length);
        // Sync to Firestore in background
        savePlan(newItems).catch((err) => {
          console.error('[useUserPlan] Failed to sync remove to Firestore:', err);
          // Revert optimistic update on error
          setItems(prevItems);
        });
        return newItems;
      });
    },
    [savePlan, planStatus]
  );

  const clearAll = useCallback(async () => {
    if (planStatus === 'pending' && !confirmWithdraw()) return;
    if (planStatus === 'approved' && !confirmReapproval()) return;
    // Optimistic update: clear local state immediately
    setItems((prevItems) => {
      console.log('[useUserPlan] Optimistically cleared all items');
      // Sync to Firestore in background
      savePlan([]).catch((err) => {
        console.error('[useUserPlan] Failed to sync clear to Firestore:', err);
        // Revert optimistic update on error
        setItems(prevItems);
      });
      return [];
    });
  }, [savePlan, planStatus]);

  const setSelectedLevel = useCallback(
    async (levelId: number) => {
      // Update local state immediately
      setSelectedLevelIdState(levelId);
      console.log('[useUserPlan] Optimistically set level:', levelId);
      // Sync to Firestore
      try {
        await savePlan(items, levelId);
      } catch (err) {
        console.error('[useUserPlan] Failed to sync level to Firestore:', err);
        // Revert on error
        setSelectedLevelIdState(selectedLevelId);
      }
    },
    [items, savePlan, selectedLevelId]
  );

  const toggleItem = useCallback(
    async (item: CatalogItem) => {
      if (planStatus === 'pending' && !confirmWithdraw()) return;
      if (planStatus === 'approved' && !confirmReapproval()) return;
      setItems((prevItems) => {
        const exists = prevItems.some((i) => i.id === item.id);
        const newItems = exists
          ? prevItems.filter((i) => i.id !== item.id)
          : [...prevItems, item];

        console.log('[useUserPlan] Optimistically toggled item:', item.id, '| Exists:', exists, '| Total items:', newItems.length);

        // Sync to Firestore in background
        savePlan(newItems).catch((err) => {
          console.error('[useUserPlan] Failed to sync toggle to Firestore:', err);
          // Revert optimistic update on error
          setItems(prevItems);
        });

        return newItems;
      });
    },
    [savePlan, planStatus]
  );

  const isInCart = useCallback(
    (itemId: string) => items.some((i) => i.id === itemId) || carriedItems.some((i) => i.id === itemId),
    [items, carriedItems]
  );

  const getQuantity = useCallback(
    (itemId: string) =>
      items.filter((i) => i.id === itemId).length +
      carriedItems.filter((i) => i.id === itemId).length,
    [items, carriedItems]
  );

  const submitPlan = useCallback(async (carryOverPoints: number = 0) => {
    if (!user) {
      setError('You must be logged in to submit your plan');
      return;
    }
    const now = new Date().toISOString();
    const quarter = currentQuarter;
    try {
      const userDocRef = doc(db, 'users', user.email);
      const totalPts =
        items.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0) +
        carriedItems.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0);
      const planData: Record<string, unknown> = {
        items,
        selectedLevelId,
        lastUpdated: now,
        planStatus: 'pending',
        planSubmittedAt: now,
        planRejectionReason: null,
        quarter,
      };
      if (Object.keys(proofEntries).length > 0) {
        planData.proofEntries = proofEntries;
      }
      if (carriedItems.length > 0) {
        planData.carriedItems = carriedItems;
      }
      if (carriedFromQuarter != null) {
        planData.carriedFromQuarter = carriedFromQuarter;
      }
      if (carryOverPoints > 0) {
        planData.carryOverPoints = carryOverPoints;
      }

      // Write planHistory snapshot to subcollection
      const historyRef = doc(collection(userDocRef, 'planHistory'), quarter);
      const historyEntry: PlanHistoryEntry = {
        quarter,
        items,
        selectedLevelId,
        totalPoints: totalPts,
        status: 'pending',
        submittedAt: now,
      };

      await Promise.all([
        setDoc(userDocRef, { plan: planData }, { merge: true }),
        setDoc(historyRef, historyEntry),
      ]);
      console.log('[useUserPlan] Plan submitted, history snapshot written for', quarter);
    } catch (err) {
      console.error('[useUserPlan] Error submitting plan:', err);
      setError('Failed to submit plan');
      throw err;
    }
  }, [user, items, selectedLevelId, proofEntries, carriedItems, carriedFromQuarter, currentQuarter]);

  const withdrawPlan = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to withdraw your plan');
      return;
    }
    const now = new Date().toISOString();
    try {
      const userDocRef = doc(db, 'users', user.email);
      const planData: Record<string, unknown> = {
        items,
        selectedLevelId,
        lastUpdated: now,
        planStatus: 'draft',
        planSubmittedAt: null,
        planRejectionReason: null,
      };
      if (Object.keys(proofEntries).length > 0) {
        planData.proofEntries = proofEntries;
      }
      await setDoc(userDocRef, { plan: planData }, { merge: true });
      console.log('[useUserPlan] Plan submission withdrawn');
    } catch (err) {
      console.error('[useUserPlan] Error withdrawing plan:', err);
      setError('Failed to withdraw plan');
      throw err;
    }
  }, [user, items, selectedLevelId, proofEntries]);

  const withdrawApproval = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    try {
      const userDocRef = doc(db, 'users', user.email);
      const planData: Record<string, unknown> = {
        items,
        selectedLevelId,
        lastUpdated: now,
        planStatus: 'draft',
        planSubmittedAt: null,
        planApprovedAt: null,
        planRejectionReason: null,
        levelAchievedOnApproval: null,
        completedItemKeys: [],
        completionStatus: null,
        completionSubmittedAt: null,
        completionRejectionReason: null,
      };
      if (Object.keys(proofEntries).length > 0) {
        planData.proofEntries = proofEntries;
      }
      await setDoc(userDocRef, { plan: planData }, { merge: true });
      console.log('[useUserPlan] Plan approval withdrawn — reverted to draft');
    } catch (err) {
      console.error('[useUserPlan] Error withdrawing approval:', err);
      setError('Failed to withdraw plan approval');
      throw err;
    }
  }, [user, items, selectedLevelId, proofEntries]);

  // ==========================================
  // Completion Review Methods
  // ==========================================

  const saveCompletionState = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!user) return;
      try {
        const userDocRef = doc(db, 'users', user.email);
        const prefixed = Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [`plan.${k}`, v])
        );
        await updateDoc(userDocRef, prefixed);
      } catch (err) {
        console.error('[useUserPlan] Error saving completion state:', err);
        throw err;
      }
    },
    [user]
  );

  const toggleItemComplete = useCallback(
    async (itemKey: string) => {
      if (completionStatus === 'pending_review' || completionStatus === 'level_up_approved') return;
      setCompletedItemKeys((prev) => {
        const next = prev.includes(itemKey)
          ? prev.filter((k) => k !== itemKey)
          : [...prev, itemKey];
        saveCompletionState({ completedItemKeys: next }).catch((err) => {
          console.error('[useUserPlan] Failed to save completion toggle:', err);
          setCompletedItemKeys(prev);
        });
        return next;
      });
    },
    [completionStatus, saveCompletionState]
  );

  const submitCompletedPlan = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const prev = completionStatus;
    setCompletionStatus('pending_review');
    setCompletionSubmittedAt(now);
    try {
      await saveCompletionState({
        completionStatus: 'pending_review',
        completionSubmittedAt: now,
        completionRejectionReason: null,
      });
    } catch (err) {
      setCompletionStatus(prev);
      setCompletionSubmittedAt(undefined);
      throw err;
    }
  }, [user, completionStatus, saveCompletionState]);

  const withdrawCompletedPlan = useCallback(async () => {
    if (!user) return;
    const prev = completionStatus;
    const prevAt = completionSubmittedAt;
    setCompletionStatus('in_progress');
    setCompletionSubmittedAt(undefined);
    try {
      await saveCompletionState({
        completionStatus: 'in_progress',
        completionSubmittedAt: null,
      });
    } catch (err) {
      setCompletionStatus(prev);
      setCompletionSubmittedAt(prevAt);
      throw err;
    }
  }, [user, completionStatus, completionSubmittedAt, saveCompletionState]);

  // ==========================================
  // Proof of Completion Methods
  // ==========================================

  const addProof = useCallback(
    async (itemId: string, proof: ProofEntry) => {
      if (!user) return;
      setProofEntries((prev) => {
        const updated = {
          ...prev,
          [itemId]: [...(prev[itemId] ?? []), proof],
        };
        saveProofEntries(updated).catch((err) => {
          console.error('[useUserPlan] Failed to save proof:', err);
          setProofEntries(prev);
        });
        return updated;
      });
    },
    [user, saveProofEntries]
  );

  const deleteProof = useCallback(
    async (itemId: string, proofId: string) => {
      if (!user) return;

      // Find the proof entry to get filePath for Storage cleanup
      const proof = proofEntries[itemId]?.find((p) => p.id === proofId);

      setProofEntries((prev) => {
        const updated = {
          ...prev,
          [itemId]: (prev[itemId] ?? []).filter((p) => p.id !== proofId),
        };
        // Clean up empty keys
        if (updated[itemId].length === 0) {
          delete updated[itemId];
        }
        saveProofEntries(updated).catch((err) => {
          console.error('[useUserPlan] Failed to delete proof:', err);
          setProofEntries(prev);
        });
        return updated;
      });

      // Best-effort Storage cleanup for file proofs
      if (proof?.filePath) {
        try {
          await deleteObject(ref(storage, proof.filePath));
        } catch (err) {
          console.warn('[useUserPlan] Could not delete storage object (best-effort):', err);
        }
      }
    },
    [user, proofEntries, saveProofEntries]
  );

  const uploadFileProof = useCallback(
    async (itemId: string, file: File) => {
      if (!user) throw new Error('Not authenticated');

      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File too large. Maximum size is 5 MB.');
      }

      setUploadingItemIds((prev) => new Set(prev).add(itemId));
      try {
        const uuid = crypto.randomUUID();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `planProofs/${user.uid}/${itemId}/${uuid}-${safeName}`;
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        const proof: ProofEntry = {
          id: uuid,
          type: 'file',
          fileName: file.name,
          fileUrl: downloadUrl,
          filePath: path,
          fileMimeType: file.type,
          fileSizeBytes: file.size,
          createdAt: new Date().toISOString(),
        };
        await addProof(itemId, proof);
      } finally {
        setUploadingItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [user, addProof]
  );

  const totalPoints = useMemo(
    () => items.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0),
    [items]
  );

  const carriedPoints = useMemo(
    () => carriedItems.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0),
    [carriedItems]
  );

  const totalItems = items.length;

  const completedItems = useMemo(
    () => items.filter((item, idx) => {
      const key = item.planItemKey ?? `${item.id}-${idx}`;
      return completedItemKeys.includes(key);
    }),
    [items, completedItemKeys]
  );

  const { completionRequirementsMet, completionShortfalls } = useMemo(() => {
    const level = levels.find((l) => l.id === selectedLevelId);
    if (!level) return { completionRequirementsMet: false, completionShortfalls: ['No target level selected'] };

    const shortfalls: string[] = [];
    const totalPts = completedItems.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0);

    if (totalPts < level.points) {
      shortfalls.push(`${level.points - totalPts} more points needed (${totalPts}/${level.points})`);
    }

    const completedIds = completedItems.map((i) => i.id);
    for (const mandatoryId of level.mandatoryItems) {
      if (!completedIds.includes(mandatoryId)) {
        shortfalls.push(`Missing mandatory item: ${mandatoryId}`);
      }
    }

    const pillarPoints: Record<string, number> = {};
    for (const item of completedItems) {
      const pillar = item.subcategory ?? item.category;
      pillarPoints[pillar] = (pillarPoints[pillar] ?? 0) + (item.promotedPoints ?? item.points);
    }
    for (const [pillar, min] of Object.entries(level.pillarRequirements)) {
      const actual = pillarPoints[pillar] ?? 0;
      if (actual < min) {
        shortfalls.push(`${pillar}: need ${min - actual} more points (${actual}/${min})`);
      }
    }

    return { completionRequirementsMet: shortfalls.length === 0, completionShortfalls: shortfalls };
  }, [completedItems, selectedLevelId]);

  return {
    items,
    selectedLevelId,
    planStatus,
    planSubmittedAt,
    planRejectionReason,
    proofEntries,
    uploadingItemIds,
    isLoading,
    error,
    addItem,
    removeItem,
    clearAll,
    setSelectedLevel,
    toggleItem,
    isInCart,
    getQuantity,
    totalPoints,
    totalItems,
    submitPlan,
    withdrawPlan,
    withdrawApproval,
    addProof,
    deleteProof,
    uploadFileProof,
    completedItemKeys,
    completionStatus,
    completionSubmittedAt,
    completionRejectionReason,
    completedItems,
    completionRequirementsMet,
    completionShortfalls,
    toggleItemComplete,
    submitCompletedPlan,
    withdrawCompletedPlan,
    carriedItems,
    carriedFromQuarter,
    carriedPoints,
  };
}
