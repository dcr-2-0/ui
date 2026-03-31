import { useState, useEffect, useMemo } from 'react';
import type { CatalogItem, PlanStatus, CompletionStatus, ProofEntry } from '../../data/types';
import { levels } from '../../data/levels';
import { professionalism } from '../../data/catalog/professionalism';
import { ProofPanel } from '../ProofPanel/ProofPanel';
import './SimulatorPage.css';
import '../CatalogPage/CatalogPage.css';

interface SimulatorPageProps {
  items: CatalogItem[];
  totalPoints: number;
  totalItems: number;
  onRemoveItem: (itemId: string) => void;
  onClearAll: () => void;
  onAddMissingItems?: (items: CatalogItem[]) => void;
  onOpenItem?: (item: CatalogItem) => void;
  // Simulator mode: controlled externally via these two props
  selectedLevelId?: number;
  onSetSelectedLevel?: (levelId: number) => void;
  // Real plan mode: level is fixed to currentLevel + 1
  currentLevel?: number | null;
  // Real plan submission workflow
  planStatus?: PlanStatus;
  planSubmittedAt?: string;
  planRejectionReason?: string;
  onSubmitPlan?: () => Promise<void>;
  onWithdrawPlan?: () => Promise<void>;
  onWithdrawApproval?: () => Promise<void>;
  // Real plan proof of completion
  proofEntries?: Record<string, ProofEntry[]>;
  onAddProof?: (itemId: string, proof: ProofEntry) => Promise<void>;
  onDeleteProof?: (itemId: string, proofId: string) => Promise<void>;
  onUploadFileProof?: (itemId: string, file: File) => Promise<void>;
  uploadingItemIds?: Set<string>;
  // Completion review (Phase 2)
  completedItemKeys?: string[];
  completionStatus?: CompletionStatus;
  completionSubmittedAt?: string;
  completionRejectionReason?: string;
  completionRequirementsMet?: boolean;
  completionShortfalls?: string[];
  onToggleItemComplete?: (itemKey: string) => Promise<void>;
  onSubmitCompletedPlan?: () => Promise<void>;
  onWithdrawCompletedPlan?: () => Promise<void>;
  // Carryover points from previous level-up (or pre-system bonus)
  carryOverPoints?: number;
  carryOverLabel?: string;
  // Quarter-end carryover: items completed in previous quarter, locked in current plan
  carriedItems?: CatalogItem[];
  carriedFromQuarter?: string;
}

export default function SimulatorPage({
  items,
  totalPoints,
  totalItems,
  onRemoveItem,
  onClearAll,
  onAddMissingItems,
  onOpenItem,
  selectedLevelId: externalSelectedLevelId,
  onSetSelectedLevel,
  currentLevel,
  planStatus,
  planSubmittedAt,
  planRejectionReason,
  onSubmitPlan,
  onWithdrawPlan,
  onWithdrawApproval,
  proofEntries,
  onAddProof,
  onDeleteProof,
  onUploadFileProof,
  uploadingItemIds,
  completedItemKeys = [],
  completionStatus,
  completionSubmittedAt,
  completionRejectionReason,
  completionRequirementsMet: _completionRequirementsMet = false,
  completionShortfalls: _completionShortfalls = [],
  onToggleItemComplete,
  onSubmitCompletedPlan,
  onWithdrawCompletedPlan,
  carryOverPoints = 0,
  carryOverLabel,
  carriedItems,
  carriedFromQuarter,
}: SimulatorPageProps) {
  const isRealPlan = !!onSetSelectedLevel;
  const carriedPoints = useMemo(
    () => (carriedItems ?? []).reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0),
    [carriedItems]
  );
  const effectiveTotalPoints = totalPoints + carryOverPoints + carriedPoints;
  const isPending = planStatus === 'pending';
  const isApproved = planStatus === 'approved';
  const isRejected = planStatus === 'rejected';
  const hasProofSupport = !!onAddProof && isApproved;
  const hasCompletionSupport = isApproved && !!onToggleItemComplete;
  const isCompletionLocked = completionStatus === 'pending_review' || completionStatus === 'admin_pending' || completionStatus === 'level_up_approved';
  const isCompletionPending = completionStatus === 'pending_review';
  const isAdminPending = completionStatus === 'admin_pending';
  const isLevelUpApproved = completionStatus === 'level_up_approved';
  const isLevelUpRejected = completionStatus === 'level_up_rejected';
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Key is `${item.id}-${idx}` — repeatable items each get independent toggle
  const [openProofItemKey, setOpenProofItemKey] = useState<string | null>(null);

  const [internalSelectedLevelId, setInternalSelectedLevelId] = useState<number>(() => {
    const saved = localStorage.getItem('dcr-selected-level');
    return saved ? parseInt(saved, 10) : 0;
  });

  // In real plan mode: always derive the target level from currentLevel
  // In simulator mode: use external or internal state
  const selectedLevelId = isRealPlan
    ? (currentLevel != null && currentLevel < 10 ? currentLevel + 1 : 0)
    : (externalSelectedLevelId !== undefined ? externalSelectedLevelId : internalSelectedLevelId);

  const handleSetSelectedLevel = (levelId: number) => {
    if (onSetSelectedLevel) {
      onSetSelectedLevel(levelId);
    } else {
      setInternalSelectedLevelId(levelId);
    }
  };

  // Persist selected level to localStorage only when using internal state
  useEffect(() => {
    if (externalSelectedLevelId === undefined && !isRealPlan) {
      localStorage.setItem('dcr-selected-level', String(internalSelectedLevelId));
    }
  }, [internalSelectedLevelId, externalSelectedLevelId, isRealPlan]);

  // Calculate requirements status
  const requirementsStatus = useMemo(() => {
    if (selectedLevelId === 0) {
      return null;
    }

    const level = levels.find((l) => l.id === selectedLevelId);
    if (!level) {
      return null;
    }

    // Calculate mandatory items (include carried items — they're already done)
    const itemIds = new Set([...items.map((item) => item.id), ...(carriedItems ?? []).map((i) => i.id)]);
    const missingMandatoryItems = level.mandatoryItems.filter((id) => !itemIds.has(id));
    const missingMandatoryNames = missingMandatoryItems
      .map((id) => professionalism.find((item) => item.id === id)?.name)
      .filter(Boolean) as string[];
    const hasAllMandatory = missingMandatoryItems.length === 0;

    // Calculate points by pillar
    const pillarStats = {
      professionalism: { items: 0, points: 0 },
      tech: { items: 0, points: 0 },
      'knowledge-unlock': { items: 0, points: 0 },
      collaboration: { items: 0, points: 0 },
    };

    items.forEach((item) => {
      const category = (item.category === 'roadmaps' ? 'tech' : item.category) as keyof typeof pillarStats;
      if (pillarStats[category]) {
        pillarStats[category].items++;
        pillarStats[category].points += item.promotedPoints ?? item.points;
      }
    });
    // Carried items also contribute to pillar stats (already completed last quarter)
    (carriedItems ?? []).forEach((item) => {
      const category = (item.category === 'roadmaps' ? 'tech' : item.category) as keyof typeof pillarStats;
      if (pillarStats[category]) {
        pillarStats[category].points += item.promotedPoints ?? item.points;
      }
    });

    // Check pillar requirements
    const pillarStatus = {
      professionalism: {
        ...pillarStats.professionalism,
        required: level.mandatoryItems.length,
        met: hasAllMandatory,
        needed: missingMandatoryItems.length,
      },
      tech: {
        ...pillarStats.tech,
        required: level.pillarRequirements.tech,
        met: pillarStats.tech.points >= level.pillarRequirements.tech,
        needed: Math.max(0, level.pillarRequirements.tech - pillarStats.tech.points),
      },
      'knowledge-unlock': {
        ...pillarStats['knowledge-unlock'],
        required: level.pillarRequirements['knowledge-unlock'],
        met: pillarStats['knowledge-unlock'].points >= level.pillarRequirements['knowledge-unlock'],
        needed: Math.max(0, level.pillarRequirements['knowledge-unlock'] - pillarStats['knowledge-unlock'].points),
      },
      collaboration: {
        ...pillarStats.collaboration,
        required: level.pillarRequirements.collaboration,
        met: pillarStats.collaboration.points >= level.pillarRequirements.collaboration,
        needed: Math.max(0, level.pillarRequirements.collaboration - pillarStats.collaboration.points),
      },
    };

    const allPillarsMet = Object.values(pillarStatus).every((p) => p.met);

    // Check overall points (carryover counts toward the total)
    const pointsNeeded = Math.max(0, level.points - effectiveTotalPoints);
    const hasEnoughPoints = effectiveTotalPoints >= level.points;

    const isComplete = hasEnoughPoints && hasAllMandatory && allPillarsMet;

    return {
      level,
      isComplete,
      hasEnoughPoints,
      hasAllMandatory,
      allPillarsMet,
      pointsNeeded,
      missingMandatoryItems,
      missingMandatoryNames,
      pillarStatus,
    };
  }, [selectedLevelId, items, effectiveTotalPoints, carriedItems]);

  // Compute completion progress locally — uses the correct local selectedLevelId (currentLevel+1 in real plan mode),
  // which may differ from what's stored in plan.selectedLevelId in Firestore.
  const completionStats = useMemo(() => {
    if (!hasCompletionSupport || !requirementsStatus) return null;
    const { level } = requirementsStatus;

    const completedItems = items.filter((item, idx) => {
      const key = item.planItemKey ?? `${item.id}-${idx}`;
      return completedItemKeys.includes(key);
    });
    // Carryover points are automatically counted as completed
    const completedPts = completedItems.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0) + carryOverPoints;

    const pillarPts: Record<string, number> = {
      professionalism: 0,
      tech: 0,
      'knowledge-unlock': 0,
      collaboration: 0,
    };
    completedItems.forEach((item) => {
      const cat = item.category === 'roadmaps' ? 'tech' : item.category;
      if (cat in pillarPts) pillarPts[cat] += item.promotedPoints ?? item.points;
    });

    const completedIds = completedItems.map((i) => i.id);
    const missingMandatory = level.mandatoryItems.filter((id) => !completedIds.includes(id));

    const shortfalls: string[] = [];
    if (completedPts < level.points)
      shortfalls.push(`Need ${level.points - completedPts} more pts (${completedPts}/${level.points})`);
    if (missingMandatory.length > 0)
      shortfalls.push(`${missingMandatory.length} mandatory item${missingMandatory.length > 1 ? 's' : ''} not marked complete`);
    for (const [pillar, min] of Object.entries(level.pillarRequirements)) {
      const actual = pillarPts[pillar] ?? 0;
      if (actual < min)
        shortfalls.push(`${pillar}: ${actual}/${min} pts completed`);
    }

    const completedMandatoryCount = level.mandatoryItems.filter((id) =>
      completedItems.some((i) => i.id === id)
    ).length;

    return {
      completedPts,
      pillarPts,
      completedItemCount: completedItems.length,
      completedMandatoryCount,
      met: shortfalls.length === 0,
      shortfalls,
    };
  }, [hasCompletionSupport, requirementsStatus, items, completedItemKeys, carryOverPoints]);

  const handleAddMissingItems = () => {
    if (!requirementsStatus || !onAddMissingItems) {
      return;
    }

    const missingItems = requirementsStatus.missingMandatoryItems
      .map((id) => professionalism.find((item) => item.id === id))
      .filter(Boolean) as CatalogItem[];

    if (missingItems.length > 0) {
      onAddMissingItems(missingItems);
    }
  };

  const handleSubmitPlan = async () => {
    if (!onSubmitPlan) return;

    if (requirementsStatus && !requirementsStatus.isComplete) {
      const shortfalls: string[] = [];
      if (!requirementsStatus.hasEnoughPoints)
        shortfalls.push(`• Need ${requirementsStatus.pointsNeeded} more total points (${effectiveTotalPoints}/${requirementsStatus.level.points})`);
      if (!requirementsStatus.hasAllMandatory)
        shortfalls.push(`• Missing mandatory items: ${requirementsStatus.missingMandatoryNames.join(', ')}`);
      if (!requirementsStatus.pillarStatus.tech.met)
        shortfalls.push(`• Tech: need ${requirementsStatus.pillarStatus.tech.needed} more points`);
      if (!requirementsStatus.pillarStatus['knowledge-unlock'].met)
        shortfalls.push(`• Knowledge Unlock: need ${requirementsStatus.pillarStatus['knowledge-unlock'].needed} more points`);
      if (!requirementsStatus.pillarStatus.collaboration.met)
        shortfalls.push(`• Collaboration: need ${requirementsStatus.pillarStatus.collaboration.needed} more points`);

      const confirmed = window.confirm(
        `Your plan does not yet meet the requirements for ${requirementsStatus.level.label}:\n\n` +
        shortfalls.join('\n') +
        '\n\nYou can still submit, but your team leader will see that the plan is insufficient for a level-up.\n\n' +
        'Do you want to submit anyway?'
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPlan();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawPlan = async () => {
    if (!onWithdrawPlan) return;
    setIsSubmitting(true);
    try {
      await onWithdrawPlan();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="simulator-page">
      {/* ── Banners: only for actionable / blocking states ── */}
      {isRealPlan && isPending && (
        <div className="plan-status-banner plan-status-pending">
          <div className="plan-status-icon"><i className="ri-time-line"></i></div>
          <div className="plan-status-content">
            <div className="plan-status-title">Awaiting Team Leader Approval</div>
            {planSubmittedAt && <div className="plan-status-meta">Submitted {formatDate(planSubmittedAt)}</div>}
          </div>
          <button className="plan-status-action" onClick={handleWithdrawPlan} disabled={isSubmitting}>
            {isSubmitting ? <><div className="spinner-small"></div> Withdrawing...</> : <><i className="ri-arrow-go-back-line"></i> Withdraw</>}
          </button>
        </div>
      )}

      {isRealPlan && isRejected && (
        <div className="plan-status-banner plan-status-rejected">
          <div className="plan-status-icon"><i className="ri-close-circle-fill"></i></div>
          <div className="plan-status-content">
            <div className="plan-status-title">Plan Rejected</div>
            {planRejectionReason && <div className="plan-status-meta">{planRejectionReason}</div>}
          </div>
        </div>
      )}


      {isRealPlan && isCompletionPending && (
        <div className="plan-status-banner plan-status-completion-pending">
          <div className="plan-status-icon"><i className="ri-time-line"></i></div>
          <div className="plan-status-content">
            <div className="plan-status-title">Awaiting Level-Up Review</div>
            {completionSubmittedAt && <div className="plan-status-meta">Sent for review {formatDate(completionSubmittedAt)}</div>}
          </div>
          <button
            className="plan-status-action"
            onClick={async () => {
              if (!onWithdrawCompletedPlan) return;
              if (!confirm('Withdraw your level-up submission?\n\nYour completed items will be kept, but your team leader will no longer see this review request. You can resubmit when ready.')) return;
              setIsSubmitting(true);
              try { await onWithdrawCompletedPlan(); } finally { setIsSubmitting(false); }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <><div className="spinner-small"></div> Withdrawing...</> : <><i className="ri-arrow-go-back-line"></i> Withdraw</>}
          </button>
        </div>
      )}

      {isRealPlan && isAdminPending && (
        <div className="plan-status-banner plan-status-completion-pending">
          <div className="plan-status-icon"><i className="ri-shield-check-line"></i></div>
          <div className="plan-status-content">
            <div className="plan-status-title">Awaiting Admin Final Approval</div>
            <div className="plan-status-meta">Your team leader recommended your level-up. An admin will finalize it shortly.</div>
          </div>
        </div>
      )}

      {isRealPlan && isLevelUpApproved && (
        <div className="plan-status-banner plan-status-level-up-approved">
          <div className="plan-status-icon"><i className="ri-medal-line"></i></div>
          <div className="plan-status-content">
            <div className="plan-status-title">Level-Up Approved!</div>
            <div className="plan-status-meta">Your level-up has been confirmed by an admin.</div>
          </div>
        </div>
      )}

      {isRealPlan && isLevelUpRejected && (
        <div className="plan-status-banner plan-status-level-up-rejected">
          <div className="plan-status-icon"><i className="ri-close-circle-fill"></i></div>
          <div className="plan-status-content">
            <div className="plan-status-title">Level-Up Review: Revision Needed</div>
            {completionRejectionReason && <div className="plan-status-meta">{completionRejectionReason}</div>}
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="simulator-layout">

        {/* ── Main column ── */}
        <div>
          {/* Hero card */}
          <div className="simulator-hero">
            <div className="simulator-hero-header">
              <div>
                <h2 className="simulator-hero-title">Your Learning Path</h2>
                <p className="simulator-hero-subtitle">
                  {isRealPlan && currentLevel != null
                    ? `Track your progress toward Level ${currentLevel + 1}`
                    : requirementsStatus
                    ? `Building toward ${requirementsStatus.level.label}`
                    : 'Add items from the catalog to build your plan'}
                </p>
              </div>
              {isRealPlan && isApproved && !isLevelUpApproved && (
                <span className="plan-status-chip chip-approved">
                  <i className="ri-checkbox-circle-fill"></i> Plan Approved
                </span>
              )}
              {isRealPlan && isLevelUpApproved && (
                <span className="plan-status-chip chip-level-up">
                  <i className="ri-medal-line"></i> Level-Up Approved
                </span>
              )}
              {isRealPlan && (!planStatus || planStatus === 'draft') && (
                <span className="plan-status-chip chip-draft">
                  <i className="ri-edit-line"></i> Draft
                </span>
              )}
            </div>

            {/* Level badges / target selector */}
            {isRealPlan && currentLevel != null ? (
              <div className="simulator-level-row">
                <div className="simulator-level-badge">
                  <span className="simulator-level-badge-current">
                    <i className="ri-user-star-line"></i> Level {currentLevel}
                  </span>
                  <i className="ri-arrow-right-line simulator-level-badge-arrow"></i>
                  <span className="simulator-level-badge-target">
                    <i className="ri-flag-line"></i> Level {currentLevel + 1}
                  </span>
                </div>
              </div>
            ) : !isRealPlan ? (
              <div className="simulator-target">
                <label className="simulator-target-label">Target Level</label>
                <select
                  className="simulator-target-select"
                  value={selectedLevelId}
                  onChange={(e) => handleSetSelectedLevel(parseInt(e.target.value, 10))}
                >
                  <option value={0}>No level selected</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label} ({level.points} points)
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Stats cards */}
            <div className="simulator-stats-row">
              {carryOverPoints > 0 && (
                <div className="simulator-stat-card stat-pending">
                  <span className="simulator-stat-card-value">+{carryOverPoints}</span>
                  <span className="simulator-stat-card-label">Prev. Level</span>
                </div>
              )}
              {isRealPlan && carriedPoints > 0 && (
                <div className="simulator-stat-card stat-warning">
                  <span className="simulator-stat-card-value">+{carriedPoints}</span>
                  <span className="simulator-stat-card-label">Carried</span>
                </div>
              )}
            </div>

            {/* Pillar progress bars — vertical */}
            {requirementsStatus && (
              <div className="simulator-pillars-v">
                {[
                  {
                    key: 'total',
                    label: 'Total Points',
                    req: requirementsStatus.level.points,
                    planned: effectiveTotalPoints,
                    done: completionStats?.completedPts ?? 0,
                    fillClass: 'fill-total',
                    isMet: requirementsStatus.hasEnoughPoints,
                    unit: 'pts',
                  },
                  {
                    key: 'professionalism',
                    label: 'Professionalism',
                    req: requirementsStatus.pillarStatus.professionalism.required,
                    planned: requirementsStatus.pillarStatus.professionalism.items,
                    done: completionStats?.completedMandatoryCount ?? 0,
                    fillClass: 'fill-professionalism',
                    isMet: requirementsStatus.pillarStatus.professionalism.met,
                    unit: 'items',
                  },
                  {
                    key: 'tech',
                    label: 'Tech',
                    req: requirementsStatus.pillarStatus.tech.required,
                    planned: requirementsStatus.pillarStatus.tech.points,
                    done: completionStats?.pillarPts.tech ?? 0,
                    fillClass: 'fill-tech',
                    isMet: requirementsStatus.pillarStatus.tech.met,
                    unit: 'pts',
                  },
                  {
                    key: 'knowledge',
                    label: 'Knowledge',
                    req: requirementsStatus.pillarStatus['knowledge-unlock'].required,
                    planned: requirementsStatus.pillarStatus['knowledge-unlock'].points,
                    done: completionStats?.pillarPts['knowledge-unlock'] ?? 0,
                    fillClass: 'fill-knowledge',
                    isMet: requirementsStatus.pillarStatus['knowledge-unlock'].met,
                    unit: 'pts',
                  },
                  {
                    key: 'collaboration',
                    label: 'Collaboration',
                    req: requirementsStatus.pillarStatus.collaboration.required,
                    planned: requirementsStatus.pillarStatus.collaboration.points,
                    done: completionStats?.pillarPts.collaboration ?? 0,
                    fillClass: 'fill-collaboration',
                    isMet: requirementsStatus.pillarStatus.collaboration.met,
                    unit: 'pts',
                  },
                ].map(({ key, label, req, planned, done, fillClass, isMet, unit }) => {
                  const scale = Math.max(planned, req, 1) * 1.15;
                  const plannedPct = Math.min(74, (planned / scale) * 100);
                  const donePct = Math.min(74, (done / scale) * 100);
                  const reqPct = Math.min(72, (req / scale) * 100);
                  const checkMet = completionStats ? done >= req : isMet;

                  return (
                    <div key={key} className="v-bar-col">
                      <div className="v-bar-name">
                        {label}
                        {checkMet && <i className="ri-checkbox-circle-fill v-bar-check" />}
                      </div>
                      <div className="v-bar-outer">
                        <div className="v-bar-bg">
                          {/* Gray area text — planned total, always visible above the fill */}
                          <div className="v-bar-gray-text" style={{ bottom: `${plannedPct}%` }}>
                            <span className="v-bar-gray-value">{planned}</span>
                            <span className="v-bar-gray-sublabel">{unit} planned</span>
                          </div>
                          {/* Planned fill from bottom */}
                          <div className={`v-bar-fill-planned ${fillClass}`} style={{ height: `${plannedPct}%` }} />
                          {/* Done fill (green, overlaid) */}
                          {done > 0 && <div className="v-bar-fill-done" style={{ height: `${donePct}%` }} />}
                          {/* Done amount inside the green fill — completion mode only */}
                          {completionStats && done > 0 && donePct >= 20 && (
                            <div className="v-bar-text-overlay" style={{ height: `${donePct}%` }}>
                              <span className="v-bar-text-value">{done}</span>
                              <span className="v-bar-text-sublabel">done</span>
                            </div>
                          )}
                        </div>
                        {req > 0 && (
                          <div className="v-bar-req-line" style={{ bottom: `${reqPct}%` }}>
                            <span className="v-bar-req-badge">REQ {req} {unit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          {/* Items list */}
          {totalItems === 0 && (carriedItems?.length ?? 0) === 0 ? (
            <div className="simulator-empty">
              <i className="ri-shopping-cart-line"></i>
              <p>No items yet. Browse the catalog and add items to your learning path.</p>
            </div>
          ) : (
            <div className="simulator-items">
              {isRealPlan && (carriedItems?.length ?? 0) > 0 && (
                <div className="simulator-carried-section">
                  <div className="simulator-carried-header">
                    <i className="ri-lock-2-line"></i>
                    <span>Carried from {carriedFromQuarter ?? 'previous quarter'}</span>
                    <span className="simulator-carried-pts">+{carriedPoints.toLocaleString()} pts</span>
                  </div>
                  {carriedItems!.map((item) => (
                    <div key={item.id} className="simulator-carried-item">
                      <div className="simulator-item-icon">
                        {item.image ? <img src={item.image} alt={item.name} /> : <i className="ri-award-line"></i>}
                      </div>
                      <div className="simulator-item-info">
                        <h4 className="simulator-item-name">{item.name}</h4>
                        <p className="simulator-item-meta">{item.promotedPoints ?? item.points} points</p>
                      </div>
                      <span className="simulator-carried-badge"><i className="ri-checkbox-circle-fill"></i> Done</span>
                    </div>
                  ))}
                </div>
              )}

              {isRealPlan && carryOverPoints > 0 && (
                <div className="simulator-pillar-group">
                  <div className="simulator-pillar-group-header">
                    <i className="ri-arrow-right-up-line"></i>
                    <span>{carryOverLabel ?? 'Previous Level Points'}</span>
                    <span className="simulator-pillar-group-pts">
                      {carryOverPoints.toLocaleString()} pts
                    </span>
                  </div>
                  <div className="simulator-item-wrapper item-completed">
                    <div className="simulator-item">
                      <div className="simulator-item-icon">
                        <i className="ri-arrow-right-up-line"></i>
                      </div>
                      <div className="simulator-item-info">
                        <h4 className="simulator-item-name">{carryOverLabel ?? 'Previous Level Points'}</h4>
                        <p className="simulator-item-meta">{carryOverPoints.toLocaleString()} points</p>
                      </div>
                      <button className="simulator-item-complete-btn completed" disabled title="Automatically completed">
                        <i className="ri-checkbox-circle-fill"></i> Completed
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const PILLARS: { key: string; label: string; icon: string }[] = [
                  { key: 'professionalism', label: 'Professionalism', icon: 'ri-briefcase-line' },
                  { key: 'tech', label: 'Tech', icon: 'ri-code-s-slash-line' },
                  { key: 'knowledge-unlock', label: 'Knowledge Unlock', icon: 'ri-lightbulb-line' },
                  { key: 'collaboration', label: 'Collaboration', icon: 'ri-team-line' },
                  { key: 'extra', label: 'Extra', icon: 'ri-star-line' },
                ];
                const indexedItems = items.map((item, globalIdx) => ({ item, globalIdx }));
                return PILLARS.map(({ key, label, icon }) => {
                  const pillarIndexedItems = indexedItems.filter(({ item }) => item.category === key || (key === 'tech' && item.category === 'roadmaps'));
                  if (pillarIndexedItems.length === 0) return null;
                  const pillarPoints = pillarIndexedItems.reduce((sum, { item }) => sum + (item.promotedPoints ?? item.points), 0);
                  return (
                    <div key={key} className="simulator-pillar-group">
                      <div className="simulator-pillar-group-header">
                        <i className={icon}></i>
                        <span>{label}</span>
                        <span className="simulator-pillar-group-pts">{pillarPoints} pts</span>
                      </div>
                      {pillarIndexedItems.map(({ item, globalIdx }) => {
                        const itemKey = item.planItemKey ?? `${item.id}-${globalIdx}`;
                        const isProofOpen = openProofItemKey === itemKey;
                        const itemProofCount = (proofEntries?.[itemKey] ?? []).length;
                        const isCompleted = completedItemKeys.includes(itemKey);
                        return (
                          <div key={itemKey} className={`simulator-item-wrapper${isCompleted ? ' item-completed' : ''}`}>
                            <div
                              className={`simulator-item${isProofOpen ? ' proof-open' : ''}`}
                              onClick={() => onOpenItem?.(item)}
                            >
                              <div className="simulator-item-icon">
                                {item.image ? <img src={item.image} alt={item.name} /> : <i className="ri-award-line"></i>}
                              </div>
                              <div className="simulator-item-info">
                                <h4 className="simulator-item-name">{item.name}</h4>
                                <p className="simulator-item-meta">{item.promotedPoints ?? item.points} points</p>
                              </div>
                              {hasProofSupport && (
                                <button
                                  className={`simulator-item-proof-btn${isProofOpen ? ' active' : ''}${itemProofCount > 0 ? ' has-proofs' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); setOpenProofItemKey(isProofOpen ? null : itemKey); }}
                                  title={isProofOpen ? 'Close attachments' : 'Add / view attachments'}
                                >
                                  <i className="ri-attachment-2-line"></i>
                                  Attachments
                                  {itemProofCount > 0 && <span className="proof-badge">{itemProofCount}</span>}
                                </button>
                              )}
                              {hasCompletionSupport && (
                                <button
                                  className={`simulator-item-complete-btn${isCompleted ? ' completed' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); if (!isCompletionLocked) onToggleItemComplete?.(itemKey); }}
                                  disabled={isCompletionLocked}
                                  title={isCompletionLocked ? 'Locked while under review' : isCompleted ? 'Mark as not completed' : 'Mark as completed'}
                                >
                                  <i className={isCompleted ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}></i>
                                  {isCompleted ? 'Completed' : 'Mark complete'}
                                </button>
                              )}
                              {!isPending && !isApproved && (
                                <button
                                  className="simulator-item-remove"
                                  onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                                  title="Remove item"
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              )}
                            </div>
                            {hasProofSupport && isProofOpen && (
                              <ProofPanel
                                itemId={itemKey}
                                itemName={item.name}
                                proofs={proofEntries?.[itemKey] ?? []}
                                isReadOnly={isPending || isCompletionPending}
                                isUploading={uploadingItemIds?.has(itemKey) ?? false}
                                onAddUrl={async (url) => {
                                  await onAddProof?.(itemKey, { id: crypto.randomUUID(), type: 'url', url, createdAt: new Date().toISOString() });
                                }}
                                onAddNote={async (note) => {
                                  await onAddProof?.(itemKey, { id: crypto.randomUUID(), type: 'note', note, createdAt: new Date().toISOString() });
                                }}
                                onAddFile={async (file) => { await onUploadFileProof?.(itemKey, file); }}
                                onDelete={async (proofId) => { await onDeleteProof?.(itemKey, proofId); }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Submit for Approval */}
          {isRealPlan && onSubmitPlan && !isPending && !isApproved && (
            <div className="plan-submit-section">
              <button
                className="plan-submit-btn"
                onClick={handleSubmitPlan}
                disabled={totalItems === 0 || isSubmitting}
                title={totalItems === 0 ? 'Add items to your plan before submitting' : undefined}
              >
                {isSubmitting ? <><div className="spinner-small"></div> Submitting...</>
                  : isRejected ? <><i className="ri-send-plane-line"></i> Resubmit for Approval</>
                  : <><i className="ri-send-plane-line"></i> Submit Plan for Approval</>}
              </button>
            </div>
          )}

          {/* Withdraw Approval (moved from sidebar) */}
          {isApproved && onWithdrawApproval && (
            <div className="plan-submit-section">
              <button
                className="plan-submit-btn plan-withdraw-approval-btn"
                onClick={async () => {
                  if (!window.confirm(
                    'Withdraw the team leader approval?\n\nYour plan will go back to draft and you can edit items again. ' +
                    'You will need to resubmit for approval before working toward a level-up.\n\nContinue?'
                  )) return;
                  setIsSubmitting(true);
                  try { await onWithdrawApproval(); } finally { setIsSubmitting(false); }
                }}
                disabled={isSubmitting}
              >
                <i className="ri-arrow-go-back-line"></i> Withdraw Approval
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="simulator-sidebar">
          {/* Action buttons */}
          {(totalItems > 0 && !isPending && !isApproved) || (isRealPlan && isApproved && onSubmitCompletedPlan && !isCompletionPending && !isLevelUpApproved) ? (
            <div className="simulator-sidebar-actions">
              {totalItems > 0 && !isPending && !isApproved && (
                <button className="simulator-clear-btn" onClick={onClearAll}>
                  <i className="ri-delete-bin-line"></i> Clear All
                </button>
              )}
              {isRealPlan && isApproved && onSubmitCompletedPlan && !isCompletionPending && !isLevelUpApproved && (
                <button
                  className="simulator-clear-btn simulator-submit-completion-btn"
                  onClick={async () => { setIsSubmitting(true); try { await onSubmitCompletedPlan(); } finally { setIsSubmitting(false); } }}
                  disabled={!completionStats?.met || isSubmitting}
                  title={!completionStats?.met ? `Requirements not met: ${completionStats?.shortfalls[0] ?? 'Mark more items as completed'}` : undefined}
                >
                  {isSubmitting ? <><div className="spinner-small"></div> Sending...</>
                    : isLevelUpRejected ? <><i className="ri-send-plane-line"></i> Resubmit Completed Plan</>
                    : <><i className="ri-send-plane-line"></i> Send Completed Plan for Review</>}
                </button>
              )}
            </div>
          ) : null}

          {/* What's missing / all good */}
          {requirementsStatus && (
            <div className="simulator-requirements-card">
              <div className="simulator-requirements-card-header">
                <div className="simulator-requirements-card-eyebrow">
                  {completionStats
                    ? (completionStats.met ? 'Ready to submit' : 'Still needed to complete')
                    : (requirementsStatus.isComplete ? 'Ready for' : 'Missing for')}
                </div>
                <div className="simulator-requirements-card-level">{requirementsStatus.level.label}</div>
              </div>

              {/* Completion mode: show what's not yet marked done */}
              {completionStats && (
                completionStats.met ? (
                  <div className="simulator-req-item" style={{ padding: '1rem 1.25rem' }}>
                    <div className="simulator-req-icon req-met"><i className="ri-check-line"></i></div>
                    <div className="simulator-req-info">
                      <div className="simulator-req-label">All items completed</div>
                      <div className="simulator-req-value">Ready to send for review</div>
                    </div>
                  </div>
                ) : (
                  <div className="simulator-req-list">
                    {completionStats.shortfalls.map((s, i) => (
                      <div key={i} className="simulator-req-item">
                        <div className="simulator-req-icon req-unmet"><i className="ri-checkbox-blank-circle-line"></i></div>
                        <div className="simulator-req-info">
                          <div className="simulator-req-label">{s}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Plan requirements mode */}
              {!completionStats && requirementsStatus.isComplete ? (
                <div className="simulator-req-item" style={{ padding: '1rem 1.25rem' }}>
                  <div className="simulator-req-icon req-met">
                    <i className="ri-check-line"></i>
                  </div>
                  <div className="simulator-req-info">
                    <div className="simulator-req-label">All requirements met</div>
                    <div className="simulator-req-value">Plan is ready to submit</div>
                  </div>
                </div>
              ) : (
                <div className="simulator-req-list">
                  {!requirementsStatus.hasEnoughPoints && (
                    <div className="simulator-req-item">
                      <div className="simulator-req-icon req-unmet"><i className="ri-coin-line"></i></div>
                      <div className="simulator-req-info">
                        <div className="simulator-req-label">Need {requirementsStatus.pointsNeeded} more pts</div>
                        <div className="simulator-req-value">{effectiveTotalPoints} / {requirementsStatus.level.points} total</div>
                      </div>
                    </div>
                  )}
                  {!requirementsStatus.hasAllMandatory && (
                    <div className="simulator-req-item">
                      <div className="simulator-req-icon req-unmet"><i className="ri-briefcase-line"></i></div>
                      <div className="simulator-req-info">
                        <div className="simulator-req-label">Missing mandatory items</div>
                        <div className="simulator-req-value">{requirementsStatus.missingMandatoryNames.join(', ')}</div>
                      </div>
                    </div>
                  )}
                  {!requirementsStatus.pillarStatus.tech.met && (
                    <div className="simulator-req-item">
                      <div className="simulator-req-icon req-unmet"><i className="ri-code-s-slash-line"></i></div>
                      <div className="simulator-req-info">
                        <div className="simulator-req-label">Tech: need {requirementsStatus.pillarStatus.tech.needed} more pts</div>
                        <div className="simulator-req-value">{requirementsStatus.pillarStatus.tech.points} / {requirementsStatus.pillarStatus.tech.required} pts</div>
                      </div>
                    </div>
                  )}
                  {!requirementsStatus.pillarStatus['knowledge-unlock'].met && (
                    <div className="simulator-req-item">
                      <div className="simulator-req-icon req-unmet"><i className="ri-lightbulb-line"></i></div>
                      <div className="simulator-req-info">
                        <div className="simulator-req-label">Knowledge: need {requirementsStatus.pillarStatus['knowledge-unlock'].needed} more pts</div>
                        <div className="simulator-req-value">{requirementsStatus.pillarStatus['knowledge-unlock'].points} / {requirementsStatus.pillarStatus['knowledge-unlock'].required} pts</div>
                      </div>
                    </div>
                  )}
                  {!requirementsStatus.pillarStatus.collaboration.met && (
                    <div className="simulator-req-item">
                      <div className="simulator-req-icon req-unmet"><i className="ri-team-line"></i></div>
                      <div className="simulator-req-info">
                        <div className="simulator-req-label">Collaboration: need {requirementsStatus.pillarStatus.collaboration.needed} more pts</div>
                        <div className="simulator-req-value">{requirementsStatus.pillarStatus.collaboration.points} / {requirementsStatus.pillarStatus.collaboration.required} pts</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!completionStats && !requirementsStatus.hasAllMandatory && onAddMissingItems && (
                <div className="simulator-req-footer">
                  <button className="simulator-req-add-btn" onClick={handleAddMissingItems}>
                    <i className="ri-add-line"></i> Add Missing Mandatory Items
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}