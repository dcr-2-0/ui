import { useState, useMemo } from 'react';
import { useAchievements } from '../../hooks/useAchievements';
import { usePlanHistory } from '../../hooks/usePlanHistory';
import { useCurrentQuarter } from '../../contexts/QuarterContext';
import type { UserDocument, CatalogItem, AchievedItem, Achievement, PlanHistoryEntry, LevelHistoryEntry, PlanStatus } from '../../data/types';
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

function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
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

function CertBadgeCard({ entry }: { entry: GalleryEntry }) {
  return (
    <div className="profile-cert-badge" title={entry.item.name}>
      <div className="profile-cert-badge-icon">
        {entry.item.image ? (
          <img src={entry.item.image} alt={entry.item.name} className="profile-cert-badge-img" />
        ) : (
          <i className="ri-award-line"></i>
        )}
      </div>
    </div>
  );
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
  onNavigate,
}: ProfilePageProps) {
  // ── All hooks before any conditional return ──
  const currentQuarter = useCurrentQuarter();
  const { achievements, isLoading: achLoading } = useAchievements(user?.email ?? null);
  const { planHistory, isLoading: histLoading } = usePlanHistory(user?.email ?? null);
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null);
  const [showCertList, setShowCertList] = useState(false);

  // Approved tech cert entries (historical + quarterly)
  const techCertEntries = useMemo<GalleryEntry[]>(() => {
    const histItems: AchievedItem[] = profile?.achieved?.items ?? [];
    const fromH: GalleryEntry[] = histItems
      .filter((a) => a.status === 'approved' && a.item.category === 'tech')
      .map((a, i) => ({
        key: `hist-${a.itemId}-${i}`,
        item: a.item,
        status: a.status,
        completionDate: a.completionDate,
        proofLink: a.proofLink,
        quarter: null,
      }));
    const fromQ: GalleryEntry[] = achievements
      .filter((a: Achievement) => a.status === 'approved' && a.item.category === 'tech')
      .map((a: Achievement) => ({
        key: a.id,
        item: a.item,
        status: a.status,
        completionDate: a.completionDate,
        proofLink: a.proofLink,
        quarter: a.quarter,
      }));
    return [...fromQ, ...fromH].sort(
      (a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()
    );
  }, [profile?.achieved?.items, achievements]);

  // 2026+ approved achievements stats
  const yearStats = useMemo(() => {
    const year2026 = achievements.filter(
      (a: Achievement) =>
        a.status === 'approved' &&
        a.quarter &&
        parseInt(a.quarter.split('-')[1]) >= 2026
    );
    return {
      points: year2026.reduce((sum: number, a: Achievement) => sum + (a.item.promotedPoints ?? a.item.points), 0),
      certs: techCertEntries.length,
      magazineArticles: year2026.filter((a: Achievement) => a.item.id === 'ku-article-magazine').length,
      externalArticles: year2026.filter((a: Achievement) => a.item.id === 'ku-article-external').length,
      reviewer: year2026.filter((a: Achievement) => a.item.id === 'col-peer-reviewer').length,
      reviewee: year2026.filter((a: Achievement) => a.item.id === 'col-peer-reviewee').length,
    };
  }, [achievements]);

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
        noData: false,
      };
    });
  }, [currentQuarter, planHistory, planStatus, planItems, planTotalPoints, planSelectedLevelId, planSubmittedAt, planRejectionReason, profile?.plan]);

  const planStatusConfig = planStatus != null ? ({
    draft:    { label: 'Draft',    icon: 'ri-draft-line',           cls: 'plan-status-draft' },
    pending:  { label: 'Pending',  icon: 'ri-time-line',            cls: 'plan-status-pending' },
    approved: { label: 'Approved', icon: 'ri-checkbox-circle-line', cls: 'plan-status-approved' },
    rejected: { label: 'Rejected', icon: 'ri-close-circle-line',    cls: 'plan-status-rejected' },
  } as const)[planStatus] ?? null : null;

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

  const yearStatItems = [
    { icon: 'ri-trophy-line', value: yearStats.points.toLocaleString(), label: 'Points earned' },
    { icon: 'ri-award-line', value: String(yearStats.certs), label: 'Certifications' },
    { icon: 'ri-newspaper-line', value: String(yearStats.magazineArticles), label: 'Magazine articles' },
    { icon: 'ri-article-line', value: String(yearStats.externalArticles), label: 'External articles' },
    { icon: 'ri-eye-line', value: String(yearStats.reviewer), label: 'Code reviews done' },
    { icon: 'ri-eye-2-line', value: String(yearStats.reviewee), label: 'Reviews received' },
  ];

  return (
    <div className="profile-page">
      {/* ── Profile Header ── */}
      <div className="profile-card profile-header-card">
        <div className="profile-header-left">
          <div className={`profile-avatar avatar-${role}`}>
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="profile-avatar-img" />
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

      {/* ── Certification Badges ── */}
      {!achLoading && techCertEntries.length > 0 && (
        <div className="profile-card profile-gallery-card">
          <div className="profile-cert-strip">
            {techCertEntries.map((entry) => (
              <CertBadgeCard key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* ── Current Plan Status Card ── */}
      {planStatus !== undefined && planStatusConfig && (() => {
        const currentLevel = profile?.currentLevel ?? null;
        const targetLevelId =
          planSelectedLevelId != null && planSelectedLevelId > 0
            ? planSelectedLevelId
            : currentLevel != null
              ? currentLevel + 1
              : null;
        const itemCount = planItems?.length ?? 0;
        const planPts = planTotalPoints ?? 0;

        return (
          <div
            className={`profile-card profile-plan-status-card${onNavigate ? ' profile-card-clickable' : ''}`}
            onClick={() => onNavigate?.('simulator')}
            role={onNavigate ? 'button' : undefined}
            tabIndex={onNavigate ? 0 : undefined}
            onKeyDown={onNavigate ? (e) => e.key === 'Enter' && onNavigate('simulator') : undefined}
          >
            <div className="profile-plan-status-row">
              <i className="ri-calendar-todo-line profile-plan-status-cal-icon"></i>
              <span className="profile-plan-status-quarter">{currentQuarter}</span>
              <span className="profile-plan-status-meta">
                {itemCount} item{itemCount !== 1 ? 's' : ''} · {planPts.toLocaleString()} pts
                {targetLevelId != null && (
                  <> · <i className="ri-arrow-right-line"></i> Level {targetLevelId}</>
                )}
              </span>
              <span className={`profile-plan-status-badge ${planStatusConfig.cls}`}>
                <i className={planStatusConfig.icon}></i>
                {planStatusConfig.label}
              </span>
              {onNavigate && <i className="ri-arrow-right-up-line profile-plan-status-open-icon"></i>}
            </div>
            {planStatus === 'rejected' && planRejectionReason && (
              <div className="profile-plan-rejection" style={{ marginTop: '0.75rem' }}>
                <i className="ri-error-warning-line"></i>
                {planRejectionReason}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 2026 Achievements Summary ── */}
      <div className="profile-card">
        <div className="profile-section-header">
          <i className="ri-bar-chart-2-line"></i>
          <h3>Summary <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(2026 and on)</span></h3>
        </div>
        <div className="profile-year-stats">
          {yearStatItems.map(({ icon, value, label }) => {
            const isCerts = label === 'Certifications';
            return (
              <div
                className={`profile-year-stat${isCerts ? ' profile-year-stat-clickable' : ''}`}
                key={label}
                onClick={isCerts ? () => setShowCertList((v) => !v) : undefined}
                role={isCerts ? 'button' : undefined}
                tabIndex={isCerts ? 0 : undefined}
                onKeyDown={isCerts ? (e) => e.key === 'Enter' && setShowCertList((v) => !v) : undefined}
              >
                <i className={`${icon} profile-year-stat-icon`}></i>
                <span className="profile-year-stat-value">{value}</span>
                <span className="profile-year-stat-label">
                  {label}
                  {isCerts && <i className={`ri-arrow-${showCertList ? 'up' : 'down'}-s-line`} style={{ fontSize: '0.8rem' }}></i>}
                </span>
              </div>
            );
          })}
        </div>
        {showCertList && techCertEntries.length > 0 && (
          <div className="profile-cert-dropdown">
            {techCertEntries.map((entry) => (
              <div key={entry.key} className="profile-cert-dropdown-row">
                {entry.item.image ? (
                  <img src={entry.item.image} alt={entry.item.name} className="profile-cert-dropdown-img" />
                ) : (
                  <i className="ri-award-line profile-cert-dropdown-icon"></i>
                )}
                <span className="profile-cert-dropdown-name">{entry.item.name}</span>
                <span className="profile-cert-dropdown-sub">{entry.item.subcategory ?? ''}</span>
                <span className="profile-cert-dropdown-quarter">{entry.quarter ?? 'Historical'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Career Timeline ── */}
      {(() => {
        const levelEntries: LevelHistoryEntry[] = profile?.levelHistory ?? [];
        const joinDate = profile?.joinedCompanyAt ?? profile?.createdAt;
        if (!joinDate && levelEntries.length === 0) return null;
        return (
          <div className="profile-card profile-timeline-card">
            <div className="profile-section-header">
              <i className="ri-route-line"></i>
              <h3>Career Journey</h3>
            </div>
            <div className="profile-timeline">
              <div className="profile-timeline-node">
                <div className="profile-timeline-dot profile-timeline-dot-join"></div>
                <div className="profile-timeline-content">
                  <span className="profile-timeline-title">Joined Develeap</span>
                  <span className="profile-timeline-date">{formatMonthYear(joinDate)}</span>
                </div>
              </div>
              {[...levelEntries]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((entry, i) => (
                  <div key={i} className="profile-timeline-node">
                    <div className="profile-timeline-line"></div>
                    <div className="profile-timeline-dot profile-timeline-dot-level">
                      <span>{entry.level}</span>
                    </div>
                    <div className="profile-timeline-content">
                      <span className="profile-timeline-title">Level {entry.level}</span>
                      {entry.quarter && (
                        <span className="profile-ach-quarter">{entry.quarter}</span>
                      )}
                      <span className="profile-timeline-date">{formatMonthYear(entry.date)}</span>
                    </div>
                  </div>
                ))}
              <div className="profile-timeline-node">
                <div className="profile-timeline-line"></div>
                <div className="profile-timeline-dot profile-timeline-dot-current">
                  <i className="ri-time-line"></i>
                </div>
                <div className="profile-timeline-content">
                  <span className="profile-timeline-title">Today</span>
                  <span className="profile-timeline-date">{formatMonthYear(new Date().toISOString())}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
          Plan history from Q1 2026 onwards. Current quarter plan is managed in the Plan page.
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
                          return (
                            <div key={`${item.id}-${i}`} className="profile-history-item-row">
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
