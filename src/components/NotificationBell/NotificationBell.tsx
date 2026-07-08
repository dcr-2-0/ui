import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { AppNotification, NotificationType } from '../../data/types';
import './NotificationBell.css';

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const TYPE_ICON: Record<NotificationType, { icon: string; tone: string }> = {
  level_up_approved: { icon: 'ri-arrow-up-circle-fill', tone: 'success' },
  level_up_rejected: { icon: 'ri-close-circle-fill', tone: 'error' },
  level_up_recommended: { icon: 'ri-send-plane-fill', tone: 'accent' },
  plan_submitted: { icon: 'ri-file-list-3-line', tone: 'accent' },
  plan_approved: { icon: 'ri-checkbox-circle-fill', tone: 'success' },
  plan_rejected: { icon: 'ri-close-circle-fill', tone: 'error' },
  completion_submitted: { icon: 'ri-flag-2-fill', tone: 'accent' },
  registration_approved: { icon: 'ri-user-follow-fill', tone: 'success' },
};

const MAX_SHOWN = 20;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Header bell with a dropdown listing recent notifications.
 * Unread entries are highlighted; reading is explicit (click an item or
 * "Mark all read") — opening the panel alone does not mark anything.
 * Portal-rendered so it escapes the window shell's backdrop-filter.
 */
export default function NotificationBell({
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback(() => {
    const rect = bellRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  }, []);

  // Close on outside interaction / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !bellRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shown = notifications.slice(0, MAX_SHOWN);

  return (
    <>
      <button
        ref={bellRef}
        className="header-bell"
        onClick={() => (open ? setOpen(false) : openPanel())}
        title="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {unreadCount > 0 && (
          <span className="notification-number">{unreadCount}</span>
        )}
        <i className="ri-notification-3-line"></i>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="nb-panel"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="nb-header">
              <span className="nb-title">
                Notifications
                {unreadCount > 0 && <span className="nb-unread-count">{unreadCount}</span>}
              </span>
              {unreadCount > 0 && (
                <button className="nb-mark-all" onClick={() => markAllAsRead()}>
                  <i className="ri-check-double-line"></i> Mark all read
                </button>
              )}
            </div>

            {shown.length === 0 ? (
              <div className="nb-empty">
                <i className="ri-notification-off-line"></i>
                <p>Nothing here yet — approvals and updates will show up in this list.</p>
              </div>
            ) : (
              <ul className="nb-list">
                {shown.map((n) => {
                  const t = TYPE_ICON[n.type] ?? { icon: 'ri-notification-3-line', tone: 'accent' };
                  return (
                    <li key={n.id}>
                      <button
                        className={`nb-item${n.read ? '' : ' unread'}`}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                        }}
                        title={n.read ? undefined : 'Mark as read'}
                      >
                        <span className={`nb-item-icon tone-${t.tone}`}>
                          <i className={t.icon}></i>
                        </span>
                        <span className="nb-item-body">
                          <span className="nb-item-title">{n.title}</span>
                          <span className="nb-item-message">{n.message}</span>
                          <span className="nb-item-time">{formatRelativeTime(n.createdAt)}</span>
                        </span>
                        {!n.read && <span className="nb-item-dot" aria-label="Unread"></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
