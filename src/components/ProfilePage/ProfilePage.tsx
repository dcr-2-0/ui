import { useState, useMemo } from 'react';
import { useAchievements } from '../../hooks/useAchievements';
import { usePlanHistory } from '../../hooks/usePlanHistory';
import { useCurrentQuarter } from '../../contexts/QuarterContext';
import type { UserDocument, CatalogItem, AchievedItem, Achievement, PlanHistoryEntry, PlanStatus } from '../../data/types';
import './ProfilePage.css';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface ProfilePageProps {
  profile: UserDocument | null;
  user: AuthUser | null;
  planStatus?: PlanStatus;
  planItems?: CatalogItem[];
  planTotalPoints?: number;
  planSelectedLevelId?: number | null;
  planSubmittedAt?: string;
  planRejectionReason?: string;
  planCarryOverPoints?: number;
  planCarryOverLabel?: string;
  onNavigate?: (id: string) => void;
  /** Deep-link: open a certification's detail modal in the catalog */
  onOpenCatalogItem?: (item: CatalogItem) => void;
}

const PILLAR_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  tech: { label: 'Tech', icon: 'ri-computer-line', color: 'var(--accent-color)' },
  professionalism: { label: 'Professionalism', icon: 'ri-shield-check-line', color: 'var(--success-color)' },
  'knowledge-unlock': { label: 'Knowledge Unlock', icon: 'ri-edit-line', color: '#8b5cf6' },
  collaboration: { label: 'Collaboration', icon: 'ri-hearts-line', color: '#ec4899' },
  roadmaps: { label: 'Roadmaps', icon: 'ri-route-line', color: 'var(--warning-color)' },
};

interface GalleryEntry {
  key: string;
  item: CatalogItem;
  status: string;
  completionDate: string;
  proofLink: string;
  quarter: string | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}


/** Returns 'Q1-2026', 'Q2-2026', ... up to (and including) endQuarter */
function getQuartersBetween(startQuarter: string, endQuarter: string): string[] {
  const parseQ = (q: string) => {
    const [qPart, year] = q.split('-');
    return { q: parseInt(qPart.slice(1)), y: parseInt(year) };
  };
  const start = parseQ(startQuarter);
  const end = parseQ(endQuarter);
  const result: string[] = [];
  let { q, y } = start;
  while (y < end.y || (y === end.y && q <= end.q)) {
    result.push(`Q${q}-${y}`);
    q++;
    if (q > 4) { q = 1; y++; }
  }
  return result;
}


interface PlanDisplayRow {
  quarter: string;
  isCurrent: boolean;
  status: PlanStatus | 'draft' | 'none';
  items: CatalogItem[];
  completedItemKeys: string[];
  totalPoints: number;
  selectedLevelId: number | null;
  levelAchieved: number | null;
  submittedAt?: string;
  rejectionReason?: string;
  resolvedAt?: string;
  carryOverPoints?: number;
  noData: boolean;
}

export default function ProfilePage({
  profile,
  user,
  planStatus,
  planItems,
  planTotalPoints,
  planSelectedLevelId,
  planSubmittedAt,
  planRejectionReason,
  planCarryOverPoints,
  // onNavigate kept in the interface for Layout compatibility; currently unused
  onOpenCatalogItem,
}: ProfilePageProps) {
  // ── All hooks before any conditional return ──
  const currentQuarter = useCurrentQuarter();
  const { achievements, isLoading: achLoading } = useAchievements(user?.email ?? null);
  const { planHistory, isLoading: histLoading } = usePlanHistory(user?.email ?? null);
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null);

  // All achieved certifications, deduped by item id:
  //  1. quarterly achievements collection (approved, tech)
  //  2. certs completed in level-up-approved quarters (planHistory)
  //  3. historical certs from onboarding (profile.achieved.items, approved)
  const certEntries = useMemo<GalleryEntry[]>(() => {
    const seen = new Set<string>();
    const out: GalleryEntry[] = [];
    const push = (key: string, item: CatalogItem, completionDate: string, quarter: string | null) => {
      if (item.category !== 'tech') return;
      if (item.id.startsWith('extra-')) return; // renewal/circle bonuses aren't certs
      if (seen.has(item.id)) return;
      seen.add(item.id);
      out.push({ key, item, status: 'approved', completionDate, proofLink: '', quarter });
    };

    achievements
      .filter((a: Achievement) => a.status === 'approved' && a.item.category === 'tech')
      .forEach((a: Achievement) => push(a.id, a.item, a.completionDate, a.quarter));

    planHistory
      .filter((e: PlanHistoryEntry) => e.status === 'approved')
      .forEach((e: PlanHistoryEntry) => {
        e.items.forEach((item, idx) => {
          const key = item.planItemKey ?? `${item.id}-${idx}`;
          // Only items explicitly marked complete during level-up review count —
          // a TL-approved plan alone means intent, not achievement.
          const done =
            (e.completedItemKeys?.includes(key) ?? false) ||
            (e.completedItemKeys?.some((k) => k.startsWith(`${item.id}-`)) ?? false);
          if (done) push(`ph-${e.quarter}-${item.id}`, item, e.resolvedAt ?? e.submittedAt, e.quarter);
        });
      });

    const histItems: AchievedItem[] = profile?.achieved?.items ?? [];
    histItems
      .filter((a) => a.status === 'approved' && a.item.category === 'tech')
      .forEach((a, i) => push(`hist-${a.itemId}-${i}`, a.item, a.completionDate, null));

    return out.sort(
      (a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()
    );
  }, [achievements, planHistory, profile?.achieved?.items]);

  // Build the full quarterly history list: current quarter down to Q1-2026
  const quarterlyHistoryList = useMemo<PlanDisplayRow[]>(() => {
    const currentQ = currentQuarter;
    const startQ = 'Q1-2026';
    const parseQ = (q: string) => {
      const [qPart, year] = q.split('-');
      return parseInt(year) * 10 + parseInt(qPart.slice(1));
    };
    if (parseQ(currentQ) < parseQ(startQ)) return [];

    const allQuarters = getQuartersBetween(startQ, currentQ).reverse(); // most recent first
    const historyMap = new Map(planHistory.map((e: PlanHistoryEntry) => [e.quarter, e]));

    return allQuarters.map((q): PlanDisplayRow => {
      const isCurrent = q === currentQ;

      if (isCurrent) {
        const hasPlanItems = planStatus !== undefined && (planItems?.length ?? 0) > 0;
        if (!hasPlanItems) {
          return { quarter: q, isCurrent: true, status: 'none', items: [], completedItemKeys: [], totalPoints: 0, selectedLevelId: null, levelAchieved: null, noData: true };
        }
        return {
          quarter: q,
          isCurrent: true,
          status: (planStatus ?? 'draft') as PlanDisplayRow['status'],
          items: planItems ?? [],
          completedItemKeys: profile?.plan?.completedItemKeys ?? [],
          totalPoints: planTotalPoints ?? 0,
          selectedLevelId: planSelectedLevelId ?? null,
          levelAchieved: profile?.plan?.levelAchievedOnApproval ?? null,
          submittedAt: planSubmittedAt,
          rejectionReason: planRejectionReason,
          carryOverPoints: planCarryOverPoints,
          noData: false,
        };
      }

      const entry = historyMap.get(q);
      if (!entry) {
        return { quarter: q, isCurrent: false, status: 'none', items: [], completedItemKeys: [], totalPoints: 0, selectedLevelId: null, levelAchieved: null, noData: true };
      }
      return {
        quarter: q,
        isCurrent: false,
        status: entry.status,
        items: entry.items,
        completedItemKeys: entry.completedItemKeys ?? [],
        totalPoints: entry.totalPoints,
        selectedLevelId: entry.selectedLevelId ?? null,
        levelAchieved: entry.levelAchieved ?? null,
        submittedAt: entry.submittedAt,
        rejectionReason: entry.rejectionReason,
        resolvedAt: entry.resolvedAt,
        carryOverPoints: entry.carryOverPoints,
        noData: false,
      };
    });
  }, [currentQuarter, planHistory, planStatus, planItems, planTotalPoints, planSelectedLevelId, planSubmittedAt, planRejectionReason, planCarryOverPoints, profile?.plan]);

  // ── Guard: not signed in ──
  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card profile-signin-prompt">
          <i className="ri-user-3-line profile-signin-icon"></i>
          <h2>Sign in to view your profile</h2>
          <p>Your personal zone shows your progress, plan, and achievements.</p>
        </div>
      </div>
    );
  }

  // ── Derivations ──
  const role = profile?.role ?? 'employee';
  const roleConfig =
    role === 'admin'
      ? { label: 'Admin', cls: 'role-admin' }
      : role === 'team_leader'
        ? { label: 'Team Leader', cls: 'role-leader' }
        : { label: 'Employee', cls: 'role-employee' };

  return (
    <div className="profile-page">
      {/* ── Profile Header ── */}
      <div className="profile-card profile-header-card">
        <div className="profile-header-left">
          <div className={`profile-avatar avatar-${role}`}>
            {(profile?.photoURL ?? user.photoURL) ? (
              <img
                src={profile?.photoURL ?? user.photoURL ?? undefined}
                alt={profile?.displayName ?? user.displayName ?? ''}
                className="profile-avatar-img"
              />
            ) : (
              <span className="profile-avatar-initials">
                {getInitials(profile?.displayName ?? user.displayName)}
              </span>
            )}
          </div>
          <div className="profile-identity">
            <h2 className="profile-name">{profile?.displayName ?? user.displayName ?? 'Unknown'}</h2>
            <p className="profile-email">{profile?.email ?? user.email}</p>
            <div className="profile-badges">
              <span className={`profile-badge ${roleConfig.cls}`}>{roleConfig.label}</span>
            </div>
            {role === 'employee' && profile?.teamLeaderName && (
              <div className="profile-meta-row profile-meta-tl">
                <i className="ri-user-star-line"></i>
                <span>TL: <strong>{profile.teamLeaderName}</strong></span>
              </div>
            )}
          </div>
        </div>
        <div className="profile-header-right">
          <div className="profile-level-circle">
            <span className="profile-level-number">{profile?.currentLevel ?? '—'}</span>
            <span className="profile-level-label">Level</span>
          </div>
        </div>
      </div>

      {/* ── Certifications (historical + level-up-approved) ── */}
      <div className="profile-card">
        <div className="profile-section-header">
          <i className="ri-award-line"></i>
          <h3>Certifications</h3>
          {certEntries.length > 0 && (
            <span className="profile-gallery-total">{certEntries.length}</span>
          )}
        </div>
        {achLoading || histLoading ? (
          <p className="profile-certs-empty">Loading…</p>
        ) : certEntries.length === 0 ? (
          <p className="profile-certs-empty">
            No certifications yet — certifications you earn in completed plans, or that were
            approved from your past history, will appear here.
          </p>
        ) : (
          <div className="profile-certs-grid">
            {certEntries.map((entry) => (
              <button
                key={entry.key}
                className="profile-cert-chip"
                onClick={() => onOpenCatalogItem?.(entry.item)}
                title={`${entry.item.name}${entry.quarter ? ` · ${entry.quarter}` : ''}`}
              >
                {entry.item.image ? (
                  <img src={entry.item.image} alt="" />
                ) : (
                  <i className="ri-award-line"></i>
                )}
                <span>{entry.item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Quarterly Plan History ── */}
      <div className="profile-card profile-history-card">
        <div className="profile-section-header">
          <i className="ri-history-line"></i>
          <h3>Quarterly History</h3>
          {quarterlyHistoryList.length > 0 && (
            <span className="profile-gallery-total">{quarterlyHistoryList.length}</span>
          )}
        </div>
        <p className="profile-history-subtitle">
          Overview of your plans by quarter, from Q1 2026 onwards.
        </p>
        {histLoading ? (
          <div className="profile-empty-state"><p>Loading history...</p></div>
        ) : quarterlyHistoryList.length === 0 ? (
          <div className="profile-empty-state">
            <i className="ri-calendar-line"></i>
            <p>No completed quarters yet — history will appear here at the end of Q1 2026.</p>
          </div>
        ) : (
          <div className="profile-history-list">
            {quarterlyHistoryList.map((row) => {
              if (row.noData) {
                return (
                  <div key={row.quarter} className="profile-history-entry profile-history-entry-empty">
                    <div className="profile-history-header profile-history-header-static">
                      <span className="profile-history-status-icon history-status-empty">
                        <i className="ri-subtract-line"></i>
                      </span>
                      <span className="profile-history-quarter">{row.quarter}</span>
                      <span className="profile-history-meta profile-history-no-plan">No plan submitted</span>
                    </div>
                  </div>
                );
              }

              const isExpanded = expandedQuarter === row.quarter;
              const statusIcon =
                row.status === 'approved' ? 'ri-checkbox-circle-line' :
                row.status === 'rejected' ? 'ri-close-circle-line' :
                'ri-time-line';
              const statusCls =
                row.status === 'approved' ? 'history-status-approved' :
                row.status === 'rejected' ? 'history-status-rejected' :
                'history-status-pending';
              return (
                <div key={row.quarter} className="profile-history-entry">
                  <button
                    className="profile-history-header"
                    onClick={() => setExpandedQuarter(isExpanded ? null : row.quarter)}
                  >
                    <span className={`profile-history-status-icon ${statusCls}`}>
                      <i className={statusIcon}></i>
                    </span>
                    <span className="profile-history-quarter">{row.quarter}</span>
                    {row.levelAchieved && (
                      <span className="profile-history-level-badge">→ Level {row.levelAchieved}</span>
                    )}
                    <span className="profile-history-meta">
                      {row.items.length} items · {row.totalPoints.toLocaleString()} pts
                      {(row.carryOverPoints ?? 0) > 0 && (
                        <span className="profile-history-carry" title="Banked points (pre-portal or previous level-up surplus) counted toward the threshold">
                          {' '}· +{row.carryOverPoints!.toLocaleString()} carryover
                        </span>
                      )}
                    </span>
                    {row.resolvedAt && (
                      <span className="profile-history-date">{formatDate(row.resolvedAt)}</span>
                    )}
                    <i className={`profile-history-chevron ri-arrow-${isExpanded ? 'up' : 'down'}-s-line`}></i>
                  </button>
                  {row.rejectionReason && !isExpanded && (
                    <div className="profile-history-rejection-inline">
                      <i className="ri-error-warning-line"></i>
                      {row.rejectionReason}
                    </div>
                  )}
                  {isExpanded && (
                    <div className="profile-history-body">
                      {row.rejectionReason && (
                        <div className="profile-plan-rejection">
                          <i className="ri-error-warning-line"></i>
                          {row.rejectionReason}
                        </div>
                      )}
                      <div className="profile-history-items">
                        {row.items.map((item: CatalogItem, i: number) => {
                          const pts = item.promotedPoints ?? item.points;
                          const pillarCfg = PILLAR_CONFIG[item.category];
                          // Completion marks — only when this quarter has completion data
                          const hasCompletionData = row.completedItemKeys.length > 0;
                          const itemKey = item.planItemKey ?? `${item.id}-${i}`;
                          const isDone =
                            hasCompletionData &&
                            (row.completedItemKeys.includes(itemKey) ||
                              row.completedItemKeys.some((k) => k.startsWith(`${item.id}-`)));
                          return (
                            <div
                              key={`${item.id}-${i}`}
                              className={`profile-history-item-row${
                                hasCompletionData ? (isDone ? ' item-done' : ' item-not-done') : ''
                              }`}
                            >
                              <div className="profile-ach-icon">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="profile-ach-img" />
                                ) : (
                                  <i className={pillarCfg?.icon ?? 'ri-star-line'}></i>
                                )}
                              </div>
                              <span className="profile-history-item-name">{item.name}</span>
                              {pts > 0 && (
                                <span className="profile-ach-pts">+{pts.toLocaleString()}</span>
                              )}
                              {hasCompletionData && (
                                <i
                                  className={
                                    isDone
                                      ? 'ri-checkbox-circle-fill profile-history-done-icon'
                                      : 'ri-checkbox-blank-circle-line profile-history-notdone-icon'
                                  }
                                  title={isDone ? 'Completed' : 'Not completed'}
                                ></i>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
