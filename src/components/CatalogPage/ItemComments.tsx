import { useState, useRef, useCallback } from 'react';
import { useItemComments } from '../../hooks/useItemComments';
import type { AuthUser } from '../../hooks/useAuth';
import './ItemComments.css';

interface ItemCommentsProps {
  itemId: string;
  authUser: AuthUser | null;
}

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

function AvatarCircle({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    return <img className="ic-avatar" src={photo} alt={name} referrerPolicy="no-referrer" />;
  }
  return (
    <div className="ic-avatar ic-avatar-initials">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ItemComments({ itemId, authUser }: ItemCommentsProps) {
  const { comments, isLoading, addComment, deleteComment } = useItemComments(itemId, authUser);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await addComment(trimmed);
      setText('');
      textareaRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, addComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="item-comments">
      <div className="ic-header">
        <span className="ic-title">Comments</span>
        {!isLoading && (
          <span className="ic-count">{comments.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="ic-loading">Loading comments…</div>
      ) : comments.length > 0 ? (
        <ul className="ic-list">
          {comments.map((c) => (
            <li key={c.id} className="ic-comment">
              <AvatarCircle name={c.userName} photo={c.userPhoto} />
              <div className="ic-comment-body">
                <div className="ic-comment-meta">
                  <span className="ic-comment-name">{c.userName}</span>
                  <span className="ic-comment-time">{formatRelativeTime(c.createdAt)}</span>
                  {authUser?.email === c.userId && (
                    <button
                      className="ic-delete-btn"
                      onClick={() => deleteComment(c.id)}
                      title="Delete comment"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  )}
                </div>
                <p className="ic-comment-text">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {authUser ? (
        <div className="ic-compose">
          <AvatarCircle name={authUser.displayName} photo={authUser.photoURL} />
          <div className="ic-compose-inner">
            <textarea
              ref={textareaRef}
              className="ic-textarea"
              rows={2}
              placeholder="Add a comment… (Ctrl+Enter to post)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="ic-post-btn"
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <p className="ic-guest-note">Sign in to leave a comment.</p>
      )}
    </div>
  );
}
