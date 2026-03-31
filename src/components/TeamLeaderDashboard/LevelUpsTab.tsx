import { useState } from 'react';
import type { LevelUpRequest, ProofEntry } from '../../data/types';

export interface LevelUpHistoryRow {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: 'employee' | 'team_leader' | 'admin';
  levelFrom: number | null;
  levelTo: number;
  date: string;
  quarter: string | null;
}

interface LevelUpsTabProps {
  requests: LevelUpRequest[];
  isLoading: boolean;
  adminUid?: string;
  isAdmin: boolean;
  allLevelHistory?: LevelUpHistoryRow[];
  /** Approved level-up requests — used by admin view for plan details on expand */
  approvedRequests?: LevelUpRequest[];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function getLevelColor(level: number) {
  if (level <= 3) return 'level-low';
  if (level <= 6) return 'level-mid';
  return 'level-high';
}

function ProofEntries({ proofs }: { proofs: ProofEntry[] }) {
  return (
    <ul className="proof-entries-list">
      {proofs.map((p) => (
        <li key={p.id} className="proof-entry">
          {p.type === 'url' && p.url && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="proof-entry-link">
              <i className="ri-link"></i><span>{p.url}</span>
            </a>
          )}
          {p.type === 'file' && p.fileUrl && (
            <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="proof-entry-link">
              <i className="ri-file-line"></i><span>{p.fileName ?? 'Download file'}</span>
            </a>
          )}
          {p.type === 'note' && p.note && (
            <span className="proof-entry-note">
              <i className="ri-sticky-note-line"></i>{p.note}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PlanItemsList({ req, expandedProofKey, onToggleProof }: {
  req: LevelUpRequest;
  expandedProofKey: string | null;
  onToggleProof: (key: string) => void;
}) {
  const proofs = req.proofEntries ?? {};
  return (
    <ul className="submission-certs">
      {req.planItems.map((item, idx) => {
        const itemKey = item.planItemKey ?? `${item.id}-${idx}`;
        const done = req.completedItemKeys.includes(itemKey);
        const itemProofs = proofs[itemKey] ?? [];
        const proofKey = `${req.id}-${itemKey}`;
        const proofExpanded = expandedProofKey === proofKey;
        return (
          <li key={itemKey} className={`submission-cert-item${done ? ' cert-completed' : ' cert-incomplete'}`}>
            <div className="cert-main">
              <i className={done ? 'ri-checkbox-circle-fill cert-done-icon' : 'ri-checkbox-blank-circle-line cert-todo-icon'}></i>
              <span className="cert-name">{item.name}</span>
              <span className="cert-points">{item.promotedPoints ?? item.points} pts</span>
              {itemProofs.length > 0 && (
                <button
                  className={`cert-proof-count${proofExpanded ? ' active' : ''}`}
                  onClick={() => onToggleProof(proofKey)}
                >
                  <i className="ri-attachment-2-line"></i> {itemProofs.length}
                  <i className={`ri-arrow-${proofExpanded ? 'up' : 'down'}-s-line`}></i>
                </button>
              )}
            </div>
            {proofExpanded && <ProofEntries proofs={itemProofs} />}
          </li>
        );
      })}
    </ul>
  );
}

export function LevelUpsTab({ requests, isLoading, isAdmin, allLevelHistory, approvedRequests = [] }: LevelUpsTabProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedProofKey, setExpandedProofKey] = useState<string | null>(null);

  const toggleExpand = (key: string) =>
    setExpandedKey((prev) => (prev === key ? null : key));

  const toggleProof = (key: string) =>
    setExpandedProofKey((prev) => (prev === key ? null : key));

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading level-up history...</p>
      </div>
    );
  }

  // ── Admin view ────────────────────────────────────────────────────────────
  if (isAdmin && allLevelHistory !== undefined) {
    if (allLevelHistory.filter((row) => row.quarter !== null).length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon"><i className="ri-medal-line"></i></div>
          <h3>No level-ups yet</h3>
          <p>Approved level-ups across all teams will appear here.</p>
        </div>
      );
    }

    return (
      <div className="pending-approvals-tab">
        <div className="tab-header">
          <h2><i className="ri-medal-line"></i> Level-Up History</h2>
          <p className="tab-description">All approved level-ups across every team, newest first.</p>
        </div>

        <ul className="levelup-history-list">
          {allLevelHistory.filter((row) => row.quarter !== null).map((row, idx) => {
            const rowKey = `${row.uid}-${row.date}-${idx}`;
            const isExpanded = expandedKey === rowKey;
            const matchedReq = row.quarter
              ? approvedRequests.find((r) => r.userId === row.uid && r.quarter === row.quarter)
              : undefined;

            return (
              <li key={rowKey} className={`levelup-history-row${isExpanded ? ' expanded' : ''}`}>
                <button
                  className="levelup-history-row-header"
                  onClick={() => toggleExpand(rowKey)}
                >
                  <div className="levelup-history-avatar">
                    {row.photoURL ? (
                      <img src={row.photoURL} alt={row.displayName} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="avatar-placeholder">
                        <i className={row.role === 'team_leader' ? 'ri-user-star-line' : 'ri-user-line'}></i>
                      </div>
                    )}
                  </div>

                  <div className="levelup-history-info">
                    <span className="levelup-history-name">
                      {row.displayName}
                      {row.role === 'team_leader' && (
                        <span className="levelup-history-role-badge">TL</span>
                      )}
                    </span>
                    <span className="levelup-history-email">{row.email}</span>
                  </div>

                  <div className="levelup-history-levels">
                    {row.levelFrom !== null ? (
                      <>
                        <span className={`levelup-history-badge ${getLevelColor(row.levelFrom)}`}>{row.levelFrom}</span>
                        <i className="ri-arrow-right-line levelup-arrow"></i>
                      </>
                    ) : (
                      <span className="levelup-history-initial">Initial</span>
                    )}
                    <span className={`levelup-history-badge ${getLevelColor(row.levelTo)}`}>{row.levelTo}</span>
                  </div>

                  <div className="levelup-history-meta">
                    {row.quarter && <span className="levelup-history-quarter">{row.quarter}</span>}
                    <span className="levelup-history-date">{formatDate(row.date)}</span>
                  </div>

                  <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line levelup-chevron`}></i>
                </button>

                {isExpanded && (
                  <div className="levelup-history-body">
                    {matchedReq ? (
                      <>
                        <div className="levelup-body-meta">
                          <span>
                            <i className="ri-checkbox-multiple-line"></i>
                            {matchedReq.completedItemKeys.length}/{matchedReq.planItems.length} items completed
                          </span>
                          {matchedReq.teamLeaderName && (
                            <span>
                              <i className="ri-user-star-line"></i>
                              Recommended by {matchedReq.teamLeaderName}
                            </span>
                          )}
                        </div>
                        <PlanItemsList req={matchedReq} expandedProofKey={expandedProofKey} onToggleProof={toggleProof} />
                      </>
                    ) : (
                      <p className="levelup-body-empty">
                        <i className="ri-information-line"></i>
                        {row.quarter ? 'Plan details not available for this entry.' : 'Initial level assignment — no plan associated.'}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── TL view ───────────────────────────────────────────────────────────────
  if (requests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><i className="ri-medal-line"></i></div>
        <h3>No level-up history yet</h3>
        <p>Level-ups you've recommended will appear here once processed.</p>
      </div>
    );
  }

  return (
    <div className="pending-approvals-tab">
      <div className="tab-header">
        <h2><i className="ri-medal-line"></i> Level-Up History</h2>
        <p className="tab-description">Level-up recommendations you submitted and their admin decision.</p>
      </div>

      <ul className="levelup-history-list">
        {requests.map((req) => {
          const isExpanded = expandedKey === req.id;
          const statusColor = req.status === 'approved'
            ? 'approval-type-approved'
            : req.status === 'rejected'
            ? 'approval-type-rejected'
            : 'approval-type-completion';
          const statusIcon = req.status === 'approved'
            ? 'ri-checkbox-circle-line'
            : req.status === 'rejected'
            ? 'ri-close-circle-line'
            : 'ri-time-line';
          const statusLabel = req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending';

          return (
            <li key={req.id} className={`levelup-history-row${isExpanded ? ' expanded' : ''}`}>
              <button
                className="levelup-history-row-header"
                onClick={() => toggleExpand(req.id)}
              >
                <div className="levelup-history-avatar">
                  {req.userPhotoURL ? (
                    <img src={req.userPhotoURL} alt={req.userDisplayName} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="avatar-placeholder"><i className="ri-user-line"></i></div>
                  )}
                </div>

                <div className="levelup-history-info">
                  <span className="levelup-history-name">{req.userDisplayName}</span>
                  <span className="levelup-history-email">{req.userEmail}</span>
                </div>

                <div className="levelup-history-levels">
                  <span className={`levelup-history-badge ${getLevelColor(req.levelFrom)}`}>{req.levelFrom}</span>
                  <i className="ri-arrow-right-line levelup-arrow"></i>
                  <span className={`levelup-history-badge ${getLevelColor(req.levelTo)}`}>{req.levelTo}</span>
                </div>

                <div className="levelup-history-meta">
                  <span className="levelup-history-quarter">{req.quarter}</span>
                  <span className={`approval-type-badge ${statusColor} levelup-status-badge`}>
                    <i className={statusIcon}></i> {statusLabel}
                  </span>
                </div>

                <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line levelup-chevron`}></i>
              </button>

              {isExpanded && (
                <div className="levelup-history-body">
                  <div className="levelup-body-meta">
                    <span>
                      <i className="ri-calendar-line"></i>
                      Recommended {formatDate(req.requestedAt)}
                    </span>
                    {req.resolvedAt && (
                      <span>
                        <i className="ri-check-double-line"></i>
                        {req.status === 'approved' ? 'Approved' : 'Rejected'} {formatDate(req.resolvedAt)}
                      </span>
                    )}
                  </div>

                  {req.rejectionReason && (
                    <div className="levelup-body-rejection">
                      <i className="ri-information-line"></i>
                      {req.rejectionReason}
                    </div>
                  )}

                  {req.planItems && req.planItems.length > 0 && (
                    <>
                      <div className="levelup-body-items-label">
                        <i className="ri-checkbox-multiple-line"></i>
                        Completed items
                        <span className="submission-count">{req.completedItemKeys.length}/{req.planItems.length}</span>
                      </div>
                      <PlanItemsList req={req} expandedProofKey={expandedProofKey} onToggleProof={toggleProof} />
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
