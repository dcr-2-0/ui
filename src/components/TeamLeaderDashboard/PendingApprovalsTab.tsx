import { useState } from 'react';
import { doc, updateDoc, collection, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { createNotification } from '../../hooks/useNotifications';
import { HR_EMAIL } from '../../data/hrConfig';
import { levels } from '../../data/levels';
import type { UserDocument, CatalogItem, LevelHistoryEntry, ProofEntry, LevelUpRequest } from '../../data/types';

function getQuarterFromDate(iso: string | undefined | null): string {
  const d = iso ? new Date(iso) : new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q}-${d.getFullYear()}`;
}

interface PendingApprovalsTabProps {
  pendingMembers: (UserDocument & { uid: string })[];
  teamLeaderId: string;
  teamLeaderName: string;
  teamLeaderEmail: string;
  pendingLevelUps?: LevelUpRequest[];
  adminUid?: string;
}

/**
 * Tab showing pending team member requests.
 * Handles two types:
 * - Initial registration: approvalStatus === 'pending' (level + historical achievements)
 * - Quarterly plan: plan.planStatus === 'pending' (approve/reject the plan items)
 */
export function PendingApprovalsTab({ pendingMembers, teamLeaderId, teamLeaderName, teamLeaderEmail, pendingLevelUps = [], adminUid }: PendingApprovalsTabProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [expandedProofKey, setExpandedProofKey] = useState<string | null>(null);

  const toggleProofs = (key: string) =>
    setExpandedProofKey((prev) => (prev === key ? null : key));

  const renderProofEntries = (proofs: ProofEntry[]) => (
    <ul className="proof-entries-list">
      {proofs.map((p) => (
        <li key={p.id} className="proof-entry">
          {p.type === 'url' && p.url && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="proof-entry-link">
              <i className="ri-link"></i>
              <span>{p.url}</span>
            </a>
          )}
          {p.type === 'file' && p.fileUrl && (
            <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="proof-entry-link">
              <i className="ri-file-line"></i>
              <span>{p.fileName ?? 'Download file'}</span>
            </a>
          )}
          {p.type === 'note' && p.note && (
            <span className="proof-entry-note">
              <i className="ri-sticky-note-line"></i>
              {p.note}
            </span>
          )}
        </li>
      ))}
    </ul>
  );

  // Determine if a member is a quarterly plan submission vs initial registration
  const isQuarterlyPlan = (member: UserDocument & { uid: string }) =>
    member.approvalStatus === 'approved' && member.plan?.planStatus === 'pending';

  // Determine if a member has sent their completed plan for level-up review
  const isCompletionReview = (member: UserDocument & { uid: string }) =>
    member.approvalStatus === 'approved' && member.plan?.completionStatus === 'pending_review';

  // Check if a plan meets the level-up requirements for the target level
  const checkPlanRequirements = (items: CatalogItem[], targetLevelId: number) => {
    const level = levels.find((l) => l.id === targetLevelId);
    if (!level) return null;

    const itemIds = new Set(items.map((i) => i.id));
    const totalPoints = items.reduce((sum, i) => sum + (i.promotedPoints ?? i.points), 0);

    const pillarPoints = { tech: 0, 'knowledge-unlock': 0, collaboration: 0, professionalism: 0 };
    items.forEach((i) => {
      const cat = i.category as keyof typeof pillarPoints;
      if (cat in pillarPoints) pillarPoints[cat] += i.promotedPoints ?? i.points;
    });

    const missingMandatory = level.mandatoryItems.filter((id) => !itemIds.has(id));
    const shortfalls: string[] = [];

    if (totalPoints < level.points)
      shortfalls.push(`Total points: ${totalPoints}/${level.points}`);
    if (missingMandatory.length > 0)
      shortfalls.push(`Missing ${missingMandatory.length} mandatory item${missingMandatory.length !== 1 ? 's' : ''}`);
    if (pillarPoints.tech < level.pillarRequirements.tech)
      shortfalls.push(`Tech: ${pillarPoints.tech}/${level.pillarRequirements.tech} pts`);
    if (pillarPoints['knowledge-unlock'] < level.pillarRequirements['knowledge-unlock'])
      shortfalls.push(`Knowledge: ${pillarPoints['knowledge-unlock']}/${level.pillarRequirements['knowledge-unlock']} pts`);
    if (pillarPoints.collaboration < level.pillarRequirements.collaboration)
      shortfalls.push(`Collaboration: ${pillarPoints.collaboration}/${level.pillarRequirements.collaboration} pts`);

    return { meetsRequirements: shortfalls.length === 0, shortfalls, level };
  };

  const handleApproveLevelUp = async (req: LevelUpRequest) => {
    if (!adminUid) return;
    if (!confirm(`Approve level-up for ${req.userDisplayName}? (Level ${req.levelFrom} → Level ${req.levelTo})`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(req.id));
      const now = new Date().toISOString();

      await updateDoc(doc(db, 'levelUpRequests', req.id), {
        status: 'approved',
        resolvedAt: now,
        resolvedBy: adminUid,
      });

      const userRef = doc(db, 'users', req.userId);
      const newLevelEntry: LevelHistoryEntry = { level: req.levelTo, date: now, quarter: req.quarter };

      await updateDoc(userRef, {
        currentLevel: req.levelTo,
        'plan.items': [],
        'plan.carriedItems': [],
        'plan.carriedFromQuarter': null,
        'plan.planStatus': 'draft',
        'plan.planSubmittedAt': null,
        'plan.planApprovedAt': null,
        'plan.planRejectionReason': null,
        'plan.quarter': null,
        'plan.proofEntries': {},
        'plan.completedItemKeys': [],
        'plan.completionStatus': 'level_up_approved',
        'plan.completionSubmittedAt': null,
        'plan.completionRejectionReason': null,
        'plan.levelAchievedOnApproval': req.levelTo,
        'plan.lastUpdated': now,
      });

      const { getDoc } = await import('firebase/firestore');
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const existing = (userSnap.data().levelHistory as LevelHistoryEntry[]) ?? [];
        await updateDoc(userRef, { levelHistory: [...existing, newLevelEntry] });
      }

      const historyRef = doc(collection(userRef, 'planHistory'), req.quarter);
      await updateDoc(historyRef, {
        status: 'approved',
        resolvedAt: now,
        levelAchieved: req.levelTo,
        completedItemKeys: req.completedItemKeys,
      }).catch(() =>
        addDoc(collection(userRef, 'planHistory'), {
          quarter: req.quarter,
          status: 'approved',
          resolvedAt: now,
          levelAchieved: req.levelTo,
          completedItemKeys: req.completedItemKeys,
        })
      );

      await createNotification({
        userId: req.userId,
        type: 'level_up_approved',
        title: 'Level-Up Approved!',
        message: `Congratulations! Your level-up to Level ${req.levelTo} for ${req.quarter} has been approved.`,
        metadata: { levelFrom: req.levelFrom, levelTo: req.levelTo, quarter: req.quarter, requestId: req.id },
      });
      await createNotification({
        userId: req.teamLeaderId,
        type: 'level_up_approved',
        title: 'Level-Up Confirmed',
        message: `Admin approved ${req.userDisplayName}'s level-up to Level ${req.levelTo} (${req.quarter}).`,
        metadata: { levelFrom: req.levelFrom, levelTo: req.levelTo, quarter: req.quarter, employeeName: req.userDisplayName, requestId: req.id },
      });

      const emailBase = { createdAt: now };
      await addDoc(collection(db, 'emailQueue'), {
        ...emailBase,
        to: req.userEmail,
        message: {
          subject: `🎉 DCR Level-Up Approved — You're now Level ${req.levelTo}!`,
          html: `<h2>Congratulations, ${req.userDisplayName}!</h2><p>Your level-up request has been approved by an admin.</p><p><strong>New Level:</strong> Level ${req.levelTo}</p><p><strong>Quarter:</strong> ${req.quarter}</p>`,
        },
      });
      await addDoc(collection(db, 'emailQueue'), {
        ...emailBase,
        to: req.teamLeaderEmail,
        message: {
          subject: `DCR Level-Up Confirmed: ${req.userDisplayName} → Level ${req.levelTo}`,
          html: `<h2>Level-Up Confirmed</h2><p>An admin approved your recommendation for <strong>${req.userDisplayName}</strong>.</p><p><strong>Level:</strong> ${req.levelFrom} → ${req.levelTo}</p><p><strong>Quarter:</strong> ${req.quarter}</p>`,
        },
      });
      if (HR_EMAIL) {
        await addDoc(collection(db, 'emailQueue'), {
          ...emailBase,
          to: HR_EMAIL,
          message: {
            subject: `DCR Level-Up: ${req.userDisplayName} → Level ${req.levelTo}`,
            html: `<h2>DCR Level-Up Approved</h2><p><strong>Employee:</strong> ${req.userDisplayName} (${req.userEmail})</p><p><strong>Level:</strong> ${req.levelFrom} → ${req.levelTo}</p><p><strong>Quarter:</strong> ${req.quarter}</p><p><strong>Team Leader:</strong> ${req.teamLeaderName}</p>`,
          },
        });
      }
    } catch (err) {
      console.error('[PendingApprovalsTab] Error approving level-up:', err);
      alert('Failed to approve level-up. Please try again.');
    } finally {
      setProcessingIds((prev) => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  };

  const handleRejectLevelUp = async (req: LevelUpRequest) => {
    if (!adminUid) return;
    const reason = prompt(`Why are you rejecting ${req.userDisplayName}'s level-up request? (Optional)`);
    if (reason === null) return;
    if (!confirm(`Reject ${req.userDisplayName}'s level-up request?`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(req.id));
      const now = new Date().toISOString();
      const rejectionReason = reason || 'No reason provided';

      await updateDoc(doc(db, 'levelUpRequests', req.id), {
        status: 'rejected',
        resolvedAt: now,
        resolvedBy: adminUid,
        rejectionReason,
      });
      await updateDoc(doc(db, 'users', req.userId), {
        'plan.completionStatus': 'level_up_rejected',
        'plan.completionRejectionReason': rejectionReason,
      });
      await createNotification({
        userId: req.userId,
        type: 'level_up_rejected',
        title: 'Level-Up Not Approved',
        message: `Your level-up request for ${req.quarter} was not approved. Reason: ${rejectionReason}`,
        metadata: { levelFrom: req.levelFrom, levelTo: req.levelTo, quarter: req.quarter, requestId: req.id },
      });
      await createNotification({
        userId: req.teamLeaderId,
        type: 'level_up_rejected',
        title: 'Level-Up Rejected',
        message: `Admin rejected ${req.userDisplayName}'s level-up request for ${req.quarter}. Reason: ${rejectionReason}`,
        metadata: { levelFrom: req.levelFrom, levelTo: req.levelTo, quarter: req.quarter, employeeName: req.userDisplayName, requestId: req.id },
      });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error rejecting level-up:', err);
      alert('Failed to reject level-up. Please try again.');
    } finally {
      setProcessingIds((prev) => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  };

  const handleApproveInitial = async (member: UserDocument & { uid: string }) => {
    const level = member.currentLevel;
    if (!level) {
      alert('This employee has no level on record — their submission may be incomplete.');
      return;
    }

    const memberAchievements = member.achieved?.items ?? [];
    const achievementNote =
      memberAchievements.length > 0
        ? ` and ${memberAchievements.length} historical achievement${memberAchievements.length !== 1 ? 's' : ''}`
        : '';

    if (!confirm(`Approve ${member.displayName} at Level ${level}${achievementNote}?`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(member.uid));
      const now = new Date().toISOString();

      const userRef = doc(db, 'users', member.uid);

      // Approve user and mark their achieved items as approved — all in one update
      const achievedUpdate = memberAchievements.length > 0
        ? {
            'achieved.items': memberAchievements.map((item) => ({ ...item, status: 'approved' })),
            'achieved.lastUpdated': now,
          }
        : {};

      const newLevelEntry: LevelHistoryEntry = { level, date: now, quarter: null };

      await updateDoc(userRef, {
        approvalStatus: 'approved',
        approvedAt: now,
        joinedCompanyAt: now,
        levelHistory: [newLevelEntry],
        ...achievedUpdate,
      });

      console.log('[PendingApprovalsTab] Approved member:', { uid: member.uid, level, achievements: memberAchievements.length });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error approving member:', err);
      alert('Failed to approve member. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.uid);
        return next;
      });
    }
  };

  const handleRejectInitial = async (member: UserDocument & { uid: string }) => {
    const reason = prompt(
      `Why are you rejecting ${member.displayName}? (Optional)`
    );
    if (reason === null) return;

    if (!confirm(`Reject ${member.displayName}'s request to join your team?`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(member.uid));

      const userRef = doc(db, 'users', member.uid);
      await updateDoc(userRef, {
        approvalStatus: 'rejected',
        teamLeaderId: null,
        rejectionReason: reason || 'No reason provided',
      });

      console.log('[PendingApprovalsTab] Rejected member:', { uid: member.uid, reason });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error rejecting member:', err);
      alert('Failed to reject member. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.uid);
        return next;
      });
    }
  };

  const handleApprovePlan = async (member: UserDocument & { uid: string }) => {
    const planItems = member.plan?.items ?? [];
    const targetLevel = member.plan?.selectedLevelId;
    if (!confirm(`Approve ${member.displayName}'s quarterly plan (${planItems.length} item${planItems.length !== 1 ? 's' : ''})?`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(member.uid));
      const now = new Date().toISOString();
      const quarter = getQuarterFromDate(member.plan?.planSubmittedAt);

      const userRef = doc(db, 'users', member.uid);

      // Resolve planHistory doc
      const historyRef = doc(collection(userRef, 'planHistory'), quarter);

      // Build level history entry if this plan includes a level-up
      const prevLevel = member.currentLevel ?? 0;
      const levelAchieved = targetLevel && targetLevel > prevLevel ? targetLevel : undefined;
      const newLevelEntry: LevelHistoryEntry | null = levelAchieved
        ? { level: levelAchieved, date: now, quarter }
        : null;

      const userUpdate: Record<string, unknown> = {
        'plan.planStatus': 'approved',
        'plan.planApprovedAt': now,
        'plan.planRejectionReason': null,
        'plan.levelAchievedOnApproval': levelAchieved ?? null,
      };
      if (levelAchieved) {
        userUpdate.currentLevel = levelAchieved;
        // Append to levelHistory array (arrayUnion not imported, so read+write is fine here)
        userUpdate.levelHistory = [
          ...(member.levelHistory ?? []),
          newLevelEntry,
        ];
      }

      await Promise.all([
        updateDoc(userRef, userUpdate),
        setDoc(historyRef, { status: 'approved', resolvedAt: now, levelAchieved: levelAchieved ?? null }, { merge: true }),
      ]);

      console.log('[PendingApprovalsTab] Approved quarterly plan:', { uid: member.uid, itemCount: planItems.length, levelAchieved });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error approving plan:', err);
      alert('Failed to approve plan. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.uid);
        return next;
      });
    }
  };

  const handleRejectPlan = async (member: UserDocument & { uid: string }) => {
    const reason = prompt(`Why are you rejecting ${member.displayName}'s plan? (Optional)`);
    if (reason === null) return;

    if (!confirm(`Reject ${member.displayName}'s quarterly plan?`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(member.uid));
      const now = new Date().toISOString();
      const quarter = getQuarterFromDate(member.plan?.planSubmittedAt);

      const userRef = doc(db, 'users', member.uid);
      const historyRef = doc(collection(userRef, 'planHistory'), quarter);
      const rejectionReason = reason || 'No reason provided';

      await Promise.all([
        updateDoc(userRef, {
          'plan.planStatus': 'rejected',
          'plan.planRejectionReason': rejectionReason,
        }),
        setDoc(historyRef, { status: 'rejected', resolvedAt: now, rejectionReason }, { merge: true }),
      ]);

      console.log('[PendingApprovalsTab] Rejected quarterly plan:', { uid: member.uid, reason });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error rejecting plan:', err);
      alert('Failed to reject plan. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.uid);
        return next;
      });
    }
  };

  const handleApproveCompletion = async (member: UserDocument & { uid: string }) => {
    const plan = member.plan;
    const prevLevel = member.currentLevel ?? 0;
    // In real plan mode the target is always currentLevel + 1.
    // Fall back to that if selectedLevelId is 0 / unset.
    const targetLevel = plan?.selectedLevelId || prevLevel + 1;
    if (targetLevel <= prevLevel) {
      alert('Cannot determine target level for this level-up. Please check the employee\'s plan.');
      return;
    }

    const completedItemKeys = plan?.completedItemKeys ?? [];
    const allPlanItems = plan?.items ?? [];
    const completedItems = allPlanItems.filter((_, idx) =>
      completedItemKeys.includes(`${allPlanItems[idx].id}-${idx}`)
    );

    if (!confirm(`Recommend level-up for ${member.displayName}? (Level ${prevLevel} → Level ${targetLevel})\n\nThis will send a final approval request to an admin.\n\n${completedItems.length} of ${allPlanItems.length} plan items marked as completed.`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(member.uid));
      const now = new Date().toISOString();
      const quarter = getQuarterFromDate(plan?.completionSubmittedAt ?? plan?.planSubmittedAt);

      const userRef = doc(db, 'users', member.uid);

      // Create level-up request for admin to review
      await addDoc(collection(db, 'levelUpRequests'), {
        userId: member.uid,
        userDisplayName: member.displayName,
        userEmail: member.email,
        userPhotoURL: member.photoURL ?? null,
        teamLeaderId,
        teamLeaderName,
        teamLeaderEmail,
        levelFrom: prevLevel,
        levelTo: targetLevel,
        quarter,
        completedItemKeys,
        planItems: allPlanItems,
        proofEntries: plan?.proofEntries ?? {},
        status: 'pending',
        requestedAt: now,
      });

      // Set user plan status to admin_pending (TL recommended, waiting for admin)
      await updateDoc(userRef, {
        'plan.completionStatus': 'admin_pending',
      });

      console.log('[PendingApprovalsTab] Level-up forwarded to admin:', { uid: member.uid, targetLevel });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error recommending level-up:', err);
      alert('Failed to send level-up recommendation. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.uid);
        return next;
      });
    }
  };

  const handleRejectCompletion = async (member: UserDocument & { uid: string }) => {
    const reason = prompt(`Why are you rejecting ${member.displayName}'s level-up request? (Optional)`);
    if (reason === null) return;

    if (!confirm(`Reject ${member.displayName}'s level-up review? They will be able to fix and resubmit.`)) return;

    try {
      setProcessingIds((prev) => new Set(prev).add(member.uid));

      const userRef = doc(db, 'users', member.uid);
      await updateDoc(userRef, {
        'plan.completionStatus': 'level_up_rejected',
        'plan.completionRejectionReason': reason || 'No reason provided',
      });

      console.log('[PendingApprovalsTab] Rejected completion review:', { uid: member.uid, reason });
    } catch (err) {
      console.error('[PendingApprovalsTab] Error rejecting completion:', err);
      alert('Failed to reject level-up review. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(member.uid);
        return next;
      });
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

  if (pendingMembers.length === 0 && pendingLevelUps.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <i className="ri-checkbox-circle-line"></i>
        </div>
        <h3>All caught up!</h3>
        <p>No pending approval requests at the moment</p>
      </div>
    );
  }

  return (
    <div className="pending-approvals-tab">
      <div className="tab-header">
        <h2>
          <i className="ri-time-line"></i>
          Pending Approvals
        </h2>
        <p className="tab-description">
          Review each employee's submitted level and historical certifications, then approve or reject.
        </p>
      </div>

      <div className="approval-cards">
        {pendingMembers.map((member) => {
          const isProcessing = processingIds.has(member.uid);
          const completion = isCompletionReview(member);
          const quarterly = !completion && isQuarterlyPlan(member);

          if (completion) {
            // Completion review card — TL verifies completed items and grants level-up
            const plan = member.plan;
            const allPlanItems = plan?.items ?? [];
            const completedItemKeys = plan?.completedItemKeys ?? [];
            const completedItems = allPlanItems.filter((item, idx) =>
              completedItemKeys.includes(`${item.id}-${idx}`)
            );
            const prevLevel = member.currentLevel ?? 0;
            const targetLevel = plan?.selectedLevelId || prevLevel + 1;
            const reqCheck = checkPlanRequirements(completedItems, targetLevel);

            return (
              <div key={member.uid} className="approval-card">
                <div className="approval-header">
                  <div className="member-avatar">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="avatar-placeholder"><i className="ri-user-line"></i></div>
                    )}
                  </div>
                  <div className="member-info">
                    <div className="member-name-row">
                      <h3>{member.displayName}</h3>
                      <span className="approval-type-badge approval-type-completion">
                        <i className="ri-medal-line"></i> Level-Up Review
                      </span>
                    </div>
                    <p className="member-email">{member.email}</p>
                    {plan?.completionSubmittedAt && (
                      <p className="request-date">
                        <i className="ri-calendar-line"></i>
                        Submitted {formatDate(plan.completionSubmittedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="employee-submission">
                  <div className="submission-section">
                    <div className="submission-label">
                      <i className="ri-bar-chart-line"></i>
                      Requesting level-up
                    </div>
                    {targetLevel ? (
                      <div className="submission-level-badge">
                        Level {prevLevel} → Level {targetLevel}
                      </div>
                    ) : (
                      <span className="submission-empty">Not set</span>
                    )}
                  </div>

                  <div className="submission-section">
                    <div className="submission-label">
                      <i className="ri-checkbox-multiple-line"></i>
                      Completed items
                      <span className="submission-count">{completedItems.length}/{allPlanItems.length}</span>
                    </div>
                    {allPlanItems.length > 0 ? (
                      <ul className="submission-certs">
                        {allPlanItems.map((item, idx) => {
                          const itemKey = `${item.id}-${idx}`;
                          const done = completedItemKeys.includes(itemKey);
                          const proofs = plan?.proofEntries?.[item.id] ?? [];
                          const proofKey = `${member.uid}-${item.id}`;
                          const proofExpanded = expandedProofKey === proofKey;
                          return (
                            <li key={itemKey} className={`submission-cert-item${done ? ' cert-completed' : ' cert-incomplete'}`}>
                              <div className="cert-main">
                                <i className={done ? 'ri-checkbox-circle-fill cert-done-icon' : 'ri-checkbox-blank-circle-line cert-todo-icon'}></i>
                                <span className="cert-name">{item.name}</span>
                                <span className="cert-points">{item.promotedPoints ?? item.points} pts</span>
                                {proofs.length > 0 && (
                                  <button
                                    className={`cert-proof-count${proofExpanded ? ' active' : ''}`}
                                    onClick={() => toggleProofs(proofKey)}
                                    title={proofExpanded ? 'Hide attachments' : 'View attachments'}
                                  >
                                    <i className="ri-attachment-2-line"></i> {proofs.length}
                                    <i className={`ri-arrow-${proofExpanded ? 'up' : 'down'}-s-line`}></i>
                                  </button>
                                )}
                              </div>
                              {proofExpanded && renderProofEntries(proofs)}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="submission-empty">No items in plan</span>
                    )}
                  </div>
                </div>

                {reqCheck && !reqCheck.meetsRequirements && (
                  <div className="plan-requirements-warning">
                    <i className="ri-alert-line"></i>
                    <div>
                      <div className="plan-requirements-warning-title">
                        Completed items may not meet {reqCheck.level.label} requirements
                      </div>
                      <ul className="plan-requirements-warning-list">
                        {reqCheck.shortfalls.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="approval-actions">
                  <button
                    className="btn-success"
                    onClick={() => handleApproveCompletion(member)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <><div className="spinner-small"></div> Processing...</>
                    ) : (
                      <><i className="ri-send-plane-line"></i> Recommend Level-Up</>
                    )}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleRejectCompletion(member)}
                    disabled={isProcessing}
                  >
                    <i className="ri-close-line"></i> Request Revision
                  </button>
                </div>
              </div>
            );
          }

          if (quarterly) {
            // Quarterly plan approval card
            const planItems = member.plan?.items ?? [];
            const planCarriedItems = member.plan?.carriedItems ?? [];
            const allPlanItems = [...planCarriedItems, ...planItems];
            const totalPlanPoints = allPlanItems.reduce(
              (sum, item) => sum + (item.promotedPoints ?? item.points),
              0
            );
            const targetLevel = member.currentLevel ? member.currentLevel + 1 : null;
            const reqCheck = targetLevel ? checkPlanRequirements(allPlanItems, targetLevel) : null;

            return (
              <div key={member.uid} className="approval-card">
                {/* Member Info */}
                <div className="approval-header">
                  <div className="member-avatar">
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
                  <div className="member-info">
                    <div className="member-name-row">
                      <h3>{member.displayName}</h3>
                      <span className="approval-type-badge approval-type-quarterly">
                        <i className="ri-calendar-check-line"></i> Quarterly Plan
                      </span>
                    </div>
                    <p className="member-email">{member.email}</p>
                    {member.plan?.planSubmittedAt && (
                      <p className="request-date">
                        <i className="ri-calendar-line"></i>
                        Submitted {formatDate(member.plan.planSubmittedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Plan Details */}
                <div className="employee-submission">
                  {/* Target Level */}
                  <div className="submission-section">
                    <div className="submission-label">
                      <i className="ri-bar-chart-line"></i>
                      Target level
                    </div>
                    {targetLevel ? (
                      <div className="submission-level-badge">
                        Level {member.currentLevel} → Level {targetLevel}
                      </div>
                    ) : (
                      <span className="submission-empty">Not set</span>
                    )}
                  </div>

                  {/* Carried items from previous quarter */}
                  {planCarriedItems.length > 0 && (
                    <div className="submission-section">
                      <div className="submission-label">
                        <i className="ri-lock-2-line"></i>
                        Carried from {member.plan?.carriedFromQuarter ?? 'previous quarter'}
                        <span className="submission-count">{planCarriedItems.length}</span>
                      </div>
                      <ul className="submission-certs">
                        {planCarriedItems.map((item) => (
                          <li key={item.id} className="submission-cert-item cert-completed">
                            <div className="cert-main">
                              <i className="ri-checkbox-circle-fill cert-done-icon"></i>
                              <span className="cert-name">{item.name}</span>
                              <span className="cert-points">{item.promotedPoints ?? item.points} pts</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="plan-total-points">
                        Carried: <strong>{planCarriedItems.reduce((s, i) => s + (i.promotedPoints ?? i.points), 0)} pts</strong>
                      </div>
                    </div>
                  )}

                  {/* Planned Items */}
                  <div className="submission-section">
                    <div className="submission-label">
                      <i className="ri-list-check"></i>
                      Planned items
                      {planItems.length > 0 && (
                        <span className="submission-count">{planItems.length}</span>
                      )}
                    </div>
                    {planItems.length > 0 ? (
                      <>
                        <ul className="submission-certs">
                          {planItems.map((item, idx) => {
                            const itemKey = `${item.id}-${idx}`;
                            const proofs = member.plan?.proofEntries?.[itemKey] ?? [];
                            const proofKey = `${member.uid}-plan-${itemKey}`;
                            const proofExpanded = expandedProofKey === proofKey;
                            return (
                            <li key={itemKey} className="submission-cert-item">
                              <div className="cert-main">
                                <span className="cert-name">{item.name}</span>
                                <span className="cert-points">{item.promotedPoints ?? item.points} pts</span>
                                {proofs.length > 0 && (
                                  <button
                                    className={`cert-proof-count${proofExpanded ? ' active' : ''}`}
                                    onClick={() => toggleProofs(proofKey)}
                                    title={proofExpanded ? 'Hide attachments' : 'View attachments'}
                                  >
                                    <i className="ri-attachment-2-line"></i> {proofs.length}
                                    <i className={`ri-arrow-${proofExpanded ? 'up' : 'down'}-s-line`}></i>
                                  </button>
                                )}
                              </div>
                              {proofExpanded && renderProofEntries(proofs)}
                            </li>
                            );
                          })}
                        </ul>
                        <div className="plan-total-points">
                          {planCarriedItems.length > 0 ? 'New items: ' : 'Total: '}<strong>{planItems.reduce((s, i) => s + (i.promotedPoints ?? i.points), 0)} pts</strong>
                        </div>
                        {planCarriedItems.length > 0 && (
                          <div className="plan-total-points">
                            Combined total: <strong>{totalPlanPoints} pts</strong>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="submission-empty">{planCarriedItems.length > 0 ? 'No additional items' : 'No items in plan'}</span>
                    )}
                  </div>
                </div>

                {/* Requirements warning */}
                {reqCheck && !reqCheck.meetsRequirements && (
                  <div className="plan-requirements-warning">
                    <i className="ri-alert-line"></i>
                    <div>
                      <div className="plan-requirements-warning-title">
                        Plan is insufficient for {reqCheck.level.label}
                      </div>
                      <ul className="plan-requirements-warning-list">
                        {reqCheck.shortfalls.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="approval-actions">
                  <button
                    className="btn-success"
                    onClick={() => handleApprovePlan(member)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="spinner-small"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line"></i>
                        Approve Plan
                      </>
                    )}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleRejectPlan(member)}
                    disabled={isProcessing}
                  >
                    <i className="ri-close-line"></i>
                    Reject
                  </button>
                </div>
              </div>
            );
          }

          // Initial registration card (existing behavior)
          const memberAchievements = member.achieved?.items ?? [];

          return (
            <div key={member.uid} className="approval-card">
              {/* Member Info */}
              <div className="approval-header">
                <div className="member-avatar">
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
                <div className="member-info">
                  <div className="member-name-row">
                    <h3>{member.displayName}</h3>
                    <span className={`approval-type-badge approval-type-${member.pendingApprovalType ?? 'initial'}`}>
                      {(member.pendingApprovalType ?? 'initial') === 'initial' ? (
                        <><i className="ri-user-add-line"></i> Initial Registration</>
                      ) : (
                        <><i className="ri-calendar-check-line"></i> Quarterly Plan</>
                      )}
                    </span>
                  </div>
                  <p className="member-email">{member.email}</p>
                  <p className="request-date">
                    <i className="ri-calendar-line"></i>
                    Requested {formatDate(member.createdAt)}
                  </p>
                </div>
              </div>

              {/* Employee's Submission */}
              <div className="employee-submission">
                {/* Reported Level */}
                <div className="submission-section">
                  <div className="submission-label">
                    <i className="ri-bar-chart-line"></i>
                    Self-reported level
                  </div>
                  {member.currentLevel ? (
                    <div className="submission-level-badge">
                      Level {member.currentLevel}
                    </div>
                  ) : (
                    <span className="submission-empty">Not provided</span>
                  )}
                </div>

                {/* Historical Certifications */}
                <div className="submission-section">
                  <div className="submission-label">
                    <i className="ri-trophy-line"></i>
                    Historical certifications
                    {memberAchievements.length > 0 && (
                      <span className="submission-count">{memberAchievements.length}</span>
                    )}
                  </div>
                  {memberAchievements.length > 0 ? (
                    <ul className="submission-certs">
                      {memberAchievements.map((a) => (
                        <li key={a.itemId} className="submission-cert-item">
                          <div className="cert-main">
                            <span className="cert-name">{a.item.name}</span>
                            <span className="cert-points">{a.item.points} pts</span>
                          </div>
                          {(a.completionDate || a.proofLink) && (
                            <div className="cert-meta">
                              {a.completionDate && (
                                <span className="cert-date">
                                  <i className="ri-calendar-line"></i>
                                  {formatDate(a.completionDate)}
                                </span>
                              )}
                              {a.proofLink && (
                                <a
                                  href={a.proofLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cert-proof"
                                >
                                  <i className="ri-external-link-line"></i>
                                  Attachment
                                </a>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="submission-empty">None submitted</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="approval-actions">
                <button
                  className="btn-success"
                  onClick={() => handleApproveInitial(member)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="spinner-small"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line"></i>
                      Approve Level {member.currentLevel ?? '?'}
                    </>
                  )}
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleRejectInitial(member)}
                  disabled={isProcessing}
                >
                  <i className="ri-close-line"></i>
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Level-up approval requests (admin only) */}
      {pendingLevelUps.length > 0 && (
        <>
          <div className="tab-section-divider">
            <i className="ri-medal-line"></i>
            Level-Up Approvals
            <span className="submission-count">{pendingLevelUps.length}</span>
          </div>
          <div className="approval-cards">
            {pendingLevelUps.map((req) => {
              const isProcessing = processingIds.has(req.id);
              const proofs = req.proofEntries ?? {};
              return (
                <div key={req.id} className="approval-card">
                  <div className="approval-header">
                    <div className="member-avatar">
                      {req.userPhotoURL ? (
                        <img src={req.userPhotoURL} alt={req.userDisplayName} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="avatar-placeholder"><i className="ri-user-line"></i></div>
                      )}
                    </div>
                    <div className="member-info">
                      <div className="member-name-row">
                        <h3>{req.userDisplayName}</h3>
                        <span className="approval-type-badge approval-type-completion">
                          <i className="ri-medal-line"></i> Level-Up Request
                        </span>
                      </div>
                      <p className="member-email">{req.userEmail}</p>
                      <p className="request-date">
                        <i className="ri-calendar-line"></i>
                        {req.quarter} · Recommended by {req.teamLeaderName} on {formatDate(req.requestedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="employee-submission">
                    <div className="submission-section">
                      <div className="submission-label">
                        <i className="ri-bar-chart-line"></i>
                        Level-up
                      </div>
                      <div className="submission-level-badge">
                        Level {req.levelFrom} → Level {req.levelTo}
                      </div>
                    </div>

                    {req.planItems && req.planItems.length > 0 && (
                      <div className="submission-section">
                        <div className="submission-label">
                          <i className="ri-checkbox-multiple-line"></i>
                          Completed items
                          <span className="submission-count">
                            {req.completedItemKeys.length}/{req.planItems.length}
                          </span>
                        </div>
                        <ul className="submission-certs">
                          {req.planItems.map((item, idx) => {
                            const itemKey = `${item.id}-${idx}`;
                            const done = req.completedItemKeys.includes(itemKey);
                            const itemProofs = proofs[itemKey] ?? [];
                            const proofKey = `lu-${req.id}-${itemKey}`;
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
                                      onClick={() => toggleProofs(proofKey)}
                                    >
                                      <i className="ri-attachment-2-line"></i> {itemProofs.length}
                                      <i className={`ri-arrow-${proofExpanded ? 'up' : 'down'}-s-line`}></i>
                                    </button>
                                  )}
                                </div>
                                {proofExpanded && renderProofEntries(itemProofs)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="approval-actions">
                    <button
                      className="btn-success"
                      onClick={() => handleApproveLevelUp(req)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><div className="spinner-small"></div> Processing...</>
                      ) : (
                        <><i className="ri-checkbox-circle-line"></i> Approve Level-Up</>
                      )}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleRejectLevelUp(req)}
                      disabled={isProcessing}
                    >
                      <i className="ri-close-line"></i> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
