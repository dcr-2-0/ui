import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ItemComment } from '../data/types';
import type { AuthUser } from './useAuth';

interface UseItemCommentsReturn {
  comments: ItemComment[];
  isLoading: boolean;
  addComment: (text: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
}

export function useItemComments(itemId: string, authUser: AuthUser | null): UseItemCommentsReturn {
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const commentsRef = collection(db, 'comments');
    const q = query(commentsRef, where('itemId', '==', itemId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as ItemComment))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setComments(loaded);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [itemId]);

  const addComment = useCallback(
    async (text: string) => {
      if (!authUser) return;
      const now = new Date().toISOString();
      await addDoc(collection(db, 'comments'), {
        itemId,
        userId: authUser.email,
        userName: authUser.displayName,
        userPhoto: authUser.photoURL,
        text: text.trim(),
        createdAt: now,
        updatedAt: now,
      });
    },
    [itemId, authUser],
  );

  const deleteComment = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'comments', id));
  }, []);

  return { comments, isLoading, addComment, deleteComment };
}
