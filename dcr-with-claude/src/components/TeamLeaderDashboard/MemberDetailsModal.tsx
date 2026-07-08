import { useState } from 'react';
import { useAchievements } from '../../hooks/useAchievements';
import { usePlanHistory } from '../../hooks/usePlanHistory';
import { levels, MANDATORY_ITEM_IDS } from '../../data/levels';
import type { UserDocument, Achievement, PlanHistoryEntry, AchievedItem } from '../../data/types';
import './MemberDetailsModal.css';

type MemberWithUid = UserDocument & { uid: string };

interface MemberDetailsModalProps {
  member: MemberWithUid;
  onClose: () => void;
}

const PILLAR_ICON: Record<string, string> = {
  tech: 'ri-computer-line',
  professionalism: 'ri-shield-check-line',
  'knowledge-unlock': 'ri-edit-line',
  collaboration: 'ri-hearts-line',
  roadmaps: 'ri-route-line',
};

const PILLAR_LABEL: Record<string, string> = {
  tech: 'Tech',
  professionalism: 'Professionalism',
  'knowledge-unlock': 'Knowledge',
  collaboration: 'Collaboration',
  roadmaps: 'Roadmaps',
};

const PILLAR_ORDER = ['tech', 'knowledge-unlock', 'collaboration', 'professionalism', 'roadmaps'];

export function MemberDetailsModal({ member, onClose }: MemberDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'plan' | 'plans' | 'summary'>('plan');
  const [showCertList, setShowCertList] = useState(false);
  const [expandedHistoryQuarter, setExpandedHistoryQuarter] = useState<string | null>(null);
  const { achievements, isLoading } = useAchievements(member.uid);
  const { planHistory, isLoading: histLoading } = usePlanHistory(member.uid);

  const getLevelColor = (level: number | null) => {
    if (!level) return 'level-0';
    if (level <= 3) return 'level-low';
    if (level <= 6) return 'level-mid';
    return 'level-high';
  };

  const planItems = member.plan?.items || [];
  const planStatus = member.plan?.planStatus;
  const targetLevel =
    member.plan?.selectedLevelId || (member.currentLevel != null ? member.currentLevel + 1 : null);
  const carryOverPoints = member.plan?.carryOverPoints ?? 0;
  const totalPoints =
    planItems.reduce((sum, item) => sum + (item.promotedPoints ?? item.points), 0) + carryOverPoints;

  // Pillar point breakdown from plan items
  const pillarPoints = { tech: 0, 'knowledge-unlock': 0, collaboration: 0 };
  for (const item of planItems) {
    const pts = item.promotedPoints ?? item.points;
    if (item.category === 'tech') pillarPoints.tech += pts;
    else if (item.category === 'knowledge-unlock') pillarPoints['knowledge-unlock'] += pts;
    else if (item.category === 'collaboration') pillarPoints.collaboration += pts;
  }

  // Mandatory items check
  const planItemIds = new Set(planItems.map((i) => i.id));
  const mandatoryStatus = MANDATORY_ITEM_IDS.map((id) => ({
    id,
    present: planItemIds.has(id),
    label: id
      .replace('prof-', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  // Level requirements for target level
  const targetLevelData = targetLevel ? levels.find((l) => l.id === targetLevel) : null;

  // Level history — last level-up
  const levelHistory = member.levelHistory ?? [];
  const lastLevelEntry =
    levelHistory.length > 0 ? levelHistory[levelHistory.length - 1] : null;

  const getProgressClass = (actual: number, required: number) => {
    if (actual >= required) return 'req-met';
    if (actual >= required * 0.8) return 'req-close';
    return 'req-miss';
  };

  // Summary stats (2026+ approved achievements)
  const year2026Approved = achievements.filter(
    (a: Achievement) =>
      a.status === 'approved' &&
      a.quarter &&
      parseInt(a.quarter.split('-')[1]) >= 2026,
  );
  // Tech certs: quarterly achievements collection + historical inline field
  const historicalTechCerts: AchievedItem[] = (member.achieved?.items ?? []).filter(
    (a) => a.status === 'approved' && a.item.category === 'tech',
  );
  const quarterlyTechCerts = achievements.filter(
    (a: Achievement) => a.status === 'approved' && a.item.category === 'tech',
  );
  const approvedTechCerts: { key: string; item: Achievement['item']; quarter: string | null }[] = [
    ...quarterlyTechCerts.map((a: Achievement) => ({ key: a.id, item: a.item, quarter: a.quarter })),
    ...historicalTechCerts.map((a: AchievedItem, i: number) => ({ key: `hist-${a.itemId}-${i}`, item: a.item, quarter: null })),
  ];
  const yearStats = {
    points: year2026Approved.reduce(
      (s: number, a: Achievement) => s + (a.item.promotedPoints ?? a.item.points),
      0,
    ),
    certs: approvedTechCerts.length,
    magazineArticles: year2026Approved.filter((a: Achievement) => a.item.id === 'ku-article-magazine').length,
    externalArticles: year2026Approved.filter((a: Achievement) => a.item.id === 'ku-article-external').length,
    reviewer: year2026Approved.filter((a: Achievement) => a.item.id === 'col-peer-reviewer').length,
    reviewee: year2026Approved.filter((a: Achievement) => a.item.id === 'col-peer-reviewee').length,
  };

  const summaryStatItems = [
    { icon: 'ri-trophy-line', value: yearStats.points.toLocaleString(), label: 'Points earned' },
    { icon: 'ri-award-line', value: String(yearStats.certs), label: 'Certifications', clickable: true },
    { icon: 'ri-newspaper-line', value: String(yearStats.magazineArticles), label: 'Magazine articles' },
    { icon: 'ri-article-line', value: String(yearStats.externalArticles), label: 'External articles' },
    { icon: 'ri-eye-line', value: String(yearStats.reviewer), label: 'Code reviews done' },
    { icon: 'ri-eye-2-line', value: String(yearStats.reviewee), label: 'Reviews received' },
  ];

  const getPlanStatusProps = (status: PlanHistoryEntry['status']) => {
    if (status === 'approved') return { icon: 'ri-checkbox-circle-line', cls: 'plan-hist-approved' };
    if (status === 'rejected') return { icon: 'ri-close-circle-line', cls: 'plan-hist-rejected' };
    return { icon: 'ri-time-line', cls: 'plan-hist-pending' };
  };

  return (
    <div className="member-details-backdrop" onClick={onClose}>
      <div className="member-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="member-details-header">
          <div className="member-details-identity">
            <div className="member-avatar-lg">
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.displayName}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="avatar-placeholder">
                  <i className="ri-user-line"></i>
                </div>
              )}
            </div>
            <div className="member-details-info">
              <h2>{member.displayName}</h2>
              <p className="member-email">{member.email}</p>
              {lastLevelEntry && (
                <p className="level-history-note">
                  <i className="ri-arrow-up-circle-line"></i>
                  At Level {lastLevelEntry.level} since{' '}
                  {lastLevelEntry.quarter ??
                    new Date(lastLevelEntry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                </p>
              )}
            </div>
          </div>
          <div className="member-details-header-right">
            <div className={`level-badge ${getLevelColor(member.currentLevel)}`}>
              <span className="level-number">{member.currentLevel ?? '?'}</span>
              <span className="level-label">Level</span>
            </div>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="member-details-tabs">
          <button
            className={`details-tab-btn ${activeTab === 'plan' ? 'active' : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            <i className="ri-list-check-3"></i>
            Current Plan
            {planStatus === 'pending' && <span className="tab-badge-dot"></span>}
          </button>
          <button
            className={`details-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            <i className="ri-history-line"></i>
            Plans History
            {planHistory.length > 0 && (
              <span className="tab-count">({planHistory.length})</span>
            )}
          </button>
          <button
            className={`details-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <i className="ri-bar-chart-2-line"></i>
            Summary
          </button>
        </div>

        {/* Tab Content */}
        <div className="member-details-body">
          {activeTab === 'plan' && (
            <div className="plan-tab">
              {/* Level Progression */}
              <div className="plan-level-progression">
                <div className="progression-side">
                  <span className="progression-label">Current</span>
                  <div className={`level-badge-sm ${getLevelColor(member.currentLevel)}`}>
                    Level {member.currentLevel != null ? member.currentLevel : '?'}
                  </div>
                </div>
                <i className="ri-arrow-right-line progression-arrow"></i>
                <div className="progression-side">
                  <span className="progression-label">Target</span>
                  <div className={`level-badge-sm ${targetLevel ? getLevelColor(targetLevel) : 'level-0'}`}>
                    {targetLevel ? `Level ${targetLevel}` : '—'}
                  </div>
                </div>
                <div className="progression-status">
                  {planStatus === 'draft' && (
                    <span className="plan-chip plan-chip-none">
                      <i className="ri-draft-line"></i> Draft
                    </span>
                  )}
                  {planStatus === 'pending' && (
                    <span className="plan-chip plan-chip-pending">
                      <i className="ri-time-line"></i> Pending approval
                    </span>
                  )}
                  {planStatus === 'approved' && (
                    <span className="plan-chip plan-chip-approved">
                      <i className="ri-checkbox-circle-line"></i> Approved
                    </span>
                  )}
                  {planStatus === 'rejected' && (
                    <span className="plan-chip plan-chip-rejected">
                      <i className="ri-close-circle-line"></i> Rejected
                    </span>
                  )}
                  {member.plan?.planSubmittedAt && (
                    <span className="plan-submitted-date">
                      <i className="ri-calendar-line"></i>
                      {new Date(member.plan.planSubmittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Requirements Alignment */}
              {targetLevelData && planItems.length > 0 && (
                <div className="plan-requirements-panel">
                  <div className="requirements-panel-title">
                    <i className="ri-bar-chart-grouped-line"></i>
                    Level {targetLevelData.id} Requirements
                  </div>

                  {/* Total Points */}
                  <div className="requirement-row">
                    <span className="req-row-label">Total Points</span>
                    <div className="req-progress-bar">
                      <div
                        className={`req-progress-fill ${getProgressClass(totalPoints, targetLevelData.points)}`}
                        style={{ width: `${Math.min(100, (totalPoints / targetLevelData.points) * 100)}%` }}
                      ></div>
                    </div>
                    <span className={`req-fraction ${getProgressClass(totalPoints, targetLevelData.points)}`}>
                      {totalPoints} / {targetLevelData.points}
                    </span>
                  </div>
                  {carryOverPoints > 0 && (
                    <div className="requirement-row carry-over-row">
                      <span className="req-row-label">
                        <i className="ri-arrow-right-up-line"></i> Prev. level carry-over
                      </span>
                      <div className="req-progress-bar"></div>
                      <span className="req-fraction carry-over-pts">+{carryOverPoints}</span>
                    </div>
                  )}

                  {/* Pillars */}
                  <div className="requirement-row">
                    <span className="req-row-label">
                      <i className="ri-computer-line"></i> Tech
                    </span>
                    <div className="req-progress-bar">
                      <div
                        className={`req-progress-fill ${getProgressClass(pillarPoints.tech, targetLevelData.pillarRequirements.tech)}`}
                        style={{ width: `${Math.min(100, (pillarPoints.tech / targetLevelData.pillarRequirements.tech) * 100)}%` }}
                      ></div>
                    </div>
                    <span className={`req-fraction ${getProgressClass(pillarPoints.tech, targetLevelData.pillarRequirements.tech)}`}>
                      {pillarPoints.tech} / {targetLevelData.pillarRequirements.tech}
                    </span>
                  </div>

                  <div className="requirement-row">
                    <span className="req-row-label">
                      <i className="ri-book-open-line"></i> Knowledge
                    </span>
                    <div className="req-progress-bar">
                      <div
                        className={`req-progress-fill ${getProgressClass(pillarPoints['knowledge-unlock'], targetLevelData.pillarRequirements['knowledge-unlock'])}`}
                        style={{ width: `${Math.min(100, (pillarPoints['knowledge-unlock'] / targetLevelData.pillarRequirements['knowledge-unlock']) * 100)}%` }}
                      ></div>
                    </div>
                    <span className={`req-fraction ${getProgressClass(pillarPoints['knowledge-unlock'], targetLevelData.pillarRequirements['knowledge-unlock'])}`}>
                      {pillarPoints['knowledge-unlock']} / {targetLevelData.pillarRequirements['knowledge-unlock']}
                    </span>
                  </div>

                  <div className="requirement-row">
                    <span className="req-row-label">
                      <i className="ri-team-line"></i> Collaboration
                    </span>
                    <div className="req-progress-bar">
                      <div
                        className={`req-progress-fill ${getProgressClass(pillarPoints.collaboration, targetLevelData.pillarRequirements.collaboration)}`}
                        style={{ width: `${Math.min(100, (pillarPoints.collaboration / targetLevelData.pillarRequirements.collaboration) * 100)}%` }}
                      ></div>
                    </div>
                    <span className={`req-fraction ${getProgressClass(pillarPoints.collaboration, targetLevelData.pillarRequirements.collaboration)}`}>
                      {pillarPoints.collaboration} / {targetLevelData.pillarRequirements.collaboration}
                    </span>
                  </div>

                  {/* Mandatory Items Checklist */}
                  <div className="mandatory-checklist-label">
                    <i className="ri-shield-check-line"></i>
                    Mandatory Items
                  </div>
                  <ul className="mandatory-checklist">
                    {mandatoryStatus.map(({ id, present, label }) => (
                      <li key={id} className={`mandatory-item ${present ? 'present' : 'missing'}`}>
                        <i className={present ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'}></i>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rejection reason */}
              {member.plan?.planRejectionReason && (
                <div className="plan-rejection-note">
                  <i className="ri-information-line"></i>
                  <div>
                    <strong>Rejection reason:</strong>{' '}
                    {member.plan.planRejectionReason}
                  </div>
                </div>
              )}

              {/* Plan items list */}
              {planItems.length > 0 ? (
                <div className="achievement-group">
                  <div className="achievement-group-label">
                    <i className="ri-list-check-3"></i>
                    Plan Items
                    <span className="submission-count">{planItems.length}</span>
                  </div>
                  {PILLAR_ORDER.filter((p) => planItems.some((i) => i.category === p)).map((pillar) => (
                    <div key={pillar} className="pillar-group">
                      <div className="pillar-group-header">
                        <i className={PILLAR_ICON[pillar] ?? 'ri-star-line'}></i>
                        {PILLAR_LABEL[pillar] ?? pillar}
                      </div>
                      <ul className="submission-certs">
                        {planItems.filter((i) => i.category === pillar).map((item, i) => (
                          <li key={`${item.id}-${i}`} className="submission-cert-item">
                            <div className="cert-main">
                              <span className="cert-name">{item.name}</span>
                              <span className="cert-points">+{item.promotedPoints ?? item.points} pts</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p className="plan-total-points">Total: {totalPoints} points</p>
                </div>
              ) : (
                !planStatus && (
                  <div className="details-empty">
                    <i className="ri-file-list-line"></i>
                    <p>No plan submitted yet</p>
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="plans-history-tab">
              {histLoading ? (
                <div className="details-loading">
                  <div className="spinner"></div>
                  <p>Loading plan history…</p>
                </div>
              ) : planHistory.length === 0 ? (
                <div className="details-empty">
                  <i className="ri-history-line"></i>
                  <p>No plan history yet</p>
                  <span className="details-empty-sub">Submitted quarterly plans will appear here</span>
                </div>
              ) : (
                <ul className="modal-plans-list">
                  {planHistory.map((entry: PlanHistoryEntry) => {
                    const { icon, cls } = getPlanStatusProps(entry.status);
                    const isExpanded = expandedHistoryQuarter === entry.quarter;
                    return (
                      <li key={entry.quarter} className="modal-plan-row modal-plan-row-expandable">
                        <button
                          className="modal-plan-row-header"
                          onClick={() => setExpandedHistoryQuarter(isExpanded ? null : entry.quarter)}
                        >
                          <span className={`modal-plan-status-icon ${cls}`}>
                            <i className={icon}></i>
                          </span>
                          <div className="modal-plan-row-content">
                            <div className="modal-plan-row-top">
                              <span className="modal-plan-quarter">{entry.quarter}</span>
                              {entry.levelAchieved && (
                                <span className="modal-plan-level-up">
                                  <i className="ri-arrow-up-circle-line"></i>
                                  Level {entry.levelAchieved}
                                </span>
                              )}
                            </div>
                            <div className="modal-plan-meta">
                              <span>{entry.items.length} items · {entry.totalPoints.toLocaleString()} pts</span>
                              {entry.resolvedAt && (
                                <span>
                                  <i className="ri-calendar-line"></i>
                                  {new Date(entry.resolvedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                            {entry.rejectionReason && !isExpanded && (
                              <div className="modal-plan-rejection">
                                <i className="ri-information-line"></i>
                                {entry.rejectionReason}
                              </div>
                            )}
                          </div>
                          <i className={`modal-plan-chevron ri-arrow-${isExpanded ? 'up' : 'down'}-s-line`}></i>
                        </button>
                        {isExpanded && (
                          <div className="modal-plan-body">
                            {entry.rejectionReason && (
                              <div className="modal-plan-rejection">
                                <i className="ri-information-line"></i>
                                {entry.rejectionReason}
                              </div>
                            )}
                            <div className="modal-plan-items-grouped">
                              {PILLAR_ORDER.filter((p) => entry.items.some((i) => i.category === p)).map((pillar) => (
                                <div key={pillar} className="pillar-group">
                                  <div className="pillar-group-header modal-pillar-group-header">
                                    <i className={PILLAR_ICON[pillar] ?? 'ri-star-line'}></i>
                                    {PILLAR_LABEL[pillar] ?? pillar}
                                  </div>
                                  <ul className="modal-plan-items-list">
                                    {entry.items.filter((i) => i.category === pillar).map((item, idx) => {
                                      const pts = item.promotedPoints ?? item.points;
                                      return (
                                        <li key={`${item.id}-${idx}`} className="modal-plan-item-row">
                                          <span className="modal-plan-item-name">{item.name}</span>
                                          {pts > 0 && (
                                            <span className="modal-plan-item-pts">+{pts.toLocaleString()}</span>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="summary-tab">
              {isLoading ? (
                <div className="details-loading">
                  <div className="spinner"></div>
                  <p>Loading achievements…</p>
                </div>
              ) : (
                <>
                  <p className="modal-summary-subtitle">2026 and on</p>
                  <div className="modal-summary-stats">
                    {summaryStatItems.map(({ icon, value, label, clickable }) => (
                      <div
                        key={label}
                        className={`modal-summary-stat${clickable ? ' modal-summary-stat-clickable' : ''}`}
                        onClick={clickable ? () => setShowCertList((v) => !v) : undefined}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onKeyDown={clickable ? (e) => e.key === 'Enter' && setShowCertList((v) => !v) : undefined}
                      >
                        <i className={`${icon} modal-summary-stat-icon`}></i>
                        <span className="modal-summary-stat-value">{value}</span>
                        <span className="modal-summary-stat-label">
                          {label}
                          {clickable && (
                            <i className={`ri-arrow-${showCertList ? 'up' : 'down'}-s-line modal-summary-stat-arrow`}></i>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {showCertList && approvedTechCerts.length > 0 && (
                    <ul className="modal-cert-list">
                      {approvedTechCerts.map((c) => (
                        <li key={c.key} className="modal-cert-row">
                          {c.item.image ? (
                            <img src={c.item.image} alt={c.item.name} className="modal-cert-img" />
                          ) : (
                            <i className="ri-award-line modal-cert-icon"></i>
                          )}
                          <span className="modal-cert-name">{c.item.name}</span>
                          <span className="modal-cert-quarter">{c.quarter ?? 'Historical'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {achievements.length === 0 && (
                    <div className="details-empty" style={{ paddingTop: '1.5rem' }}>
                      <i className="ri-bar-chart-2-line"></i>
                      <p>No achievements recorded yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
