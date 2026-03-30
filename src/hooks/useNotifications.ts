import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AppNotification, NotificationType } from '../data/types';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: AppNotification['metadata'];
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  /** Newest notification since last render (for triggering a toast) */
  latestNew: AppNotification | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(uid: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestNew, setLatestNew] = useState<AppNotification | null>(null);
  const prevCountRef = useRef(0);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'notifications'), where('userId', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as AppNotification))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        // Detect newly arrived notifications (skip on initial load)
        if (!initialLoadRef.current) {
          const unread = data.filter((n) => !n.read);
          if (unread.length > prevCountRef.current) {
            setLatestNew(unread[0]);
          }
        }
        initialLoadRef.current = false;
        prevCountRef.current = data.filter((n) => !n.read).length;

        setNotifications(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useNotifications] Error:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const markAsRead = async (id: string): Promise<void> => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllAsRead = async (): Promise<void> => {
    if (!uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, isLoading, latestNew, markAsRead, markAllAsRead };
}

/**
 * Standalone helper to create a notification document.
 * Called from approval handlers (not a hook — safe to call inside async functions).
 */
export async function createNotification(data: CreateNotificationData): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
    metadata: data.metadata ?? {},
  });
}
