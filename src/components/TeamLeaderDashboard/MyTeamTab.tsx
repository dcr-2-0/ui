import { useMemo, useState } from 'react';
import type { UserDocument } from '../../data/types';
import type { TeamLeaderWithUid } from '../../hooks/useTeamMembers';
import { MemberDetailsModal } from './MemberDetailsModal';

type MemberWithUid = UserDocument & { uid: string };

interface MyTeamTabProps {
  approvedMembers: MemberWithUid[];
  isAdmin?: boolean;
  teamLeaders?: TeamLeaderWithUid[];
}

/**
 * Tab showing approved team members
 * Team leader: flat grid of their members
 * Admin: grouped by team with team leader header
 */
const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

export function MyTeamTab({ approvedMembers, isAdmin = false, teamLeaders = [] }: MyTeamTabProps) {
  const [selectedMember, setSelectedMember] = useState<MemberWithUid | null>(null);
  const getPlanChip = (member: MemberWithUid) => {
    const status = member.plan?.planStatus;
    if (!status || status === 'draft') {
      return (
        <span className="plan-chip plan-chip-none">
          <i className="ri-file-list-line"></i> No {currentQuarter} plan submitted
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="plan-chip plan-chip-pending">
          <i className="ri-time-line"></i> {currentQuarter} plan pending approval
        </span>
      );
    }
    if (status === 'approved') {
      return (
        <span className="plan-chip plan-chip-approved">
          <i className="ri-checkbox-circle-line"></i> {currentQuarter} plan approved
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="plan-chip plan-chip-rejected">
          <i className="ri-close-circle-line"></i> {currentQuarter} plan rejected
        </span>
      );
    }
    return null;
  };

  const getLevelColor = (level: number | null) => {
    if (!level) return 'level-0';
    if (level <= 3) return 'level-low';
    if (level <= 6) return 'level-mid';
    return 'level-high';
  };

  // Group members by team leader for admin view
  const teamGroups = useMemo(() => {
    if (!isAdmin) return null;

    const groups = new Map<string, { leader: TeamLeaderWithUid | null; members: MemberWithUid[] }>();

    for (const member of approvedMembers) {
      const leaderId = member.teamLeaderId || 'unassigned';

      if (!groups.has(leaderId)) {
        const leader = teamLeaders.find((tl) => tl.uid === leaderId) || null;
        groups.set(leaderId, { leader, members: [] });
      }
      groups.get(leaderId)!.members.push(member);
    }

    // Sort: teams with leaders first (alphabetical), unassigned last
    return Array.from(groups.entries()).sort(([idA, a], [idB, b]) => {
      if (idA === 'unassigned') return 1;
      if (idB === 'unassigned') return -1;
      const nameA = a.leader?.displayName || '';
      const nameB = b.leader?.displayName || '';
      return nameA.localeCompare(nameB);
    });
  }, [isAdmin, approvedMembers, teamLeaders]);

  if (approvedMembers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <i className="ri-group-line"></i>
        </div>
        <h3>No team members yet</h3>
        <p>Approved team members will appear here</p>
      </div>
    );
  }

  // Compact horizontal strip per member — roster scanning beats cards here
  const renderMemberCard = (member: MemberWithUid) => (
    <div
      key={member.uid}
      className="member-row"
      onClick={() => setSelectedMember(member)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setSelectedMember(member)}
    >
      <div className="member-avatar member-row-avatar">
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
      <div className="member-row-identity">
        <span className="member-row-name">{member.displayName}</span>
        <span className="member-row-email">{member.email}</span>
      </div>
      <div className="member-row-chip">{getPlanChip(member)}</div>
      <div className={`level-badge member-row-level ${getLevelColor(member.currentLevel)}`}>
        <span className="level-number">{member.currentLevel ?? '?'}</span>
        <span className="level-label">Level</span>
      </div>
      <i className="ri-arrow-right-s-line member-row-chevron"></i>
    </div>
  );

  // Admin view: grouped by team
  if (isAdmin && teamGroups) {
    return (
      <>
        {selectedMember && (
          <MemberDetailsModal member={selectedMember} onClose={() => setSelectedMember(null)} />
        )}
        <div className="my-team-tab">
        <div className="tab-header">
          <h2>
            <i className="ri-group-line"></i>
            All Teams
          </h2>
        </div>

        {teamGroups.map(([leaderId, { leader, members }]) => (
          <div key={leaderId} className="team-group">
            <div className="team-group-header">
              {leader ? (
                /* TL as a card, like any employee — image, name, mail,
                   level badge in the card's corner */
                <div
                  className="team-card tl-team-card"
                  onClick={() => setSelectedMember(leader)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedMember(leader)}
                  title="View team leader details"
                >
                  <div className="team-card-header">
                    <div className="member-avatar">
                      {leader.photoURL ? (
                        <img src={leader.photoURL} alt={leader.displayName} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="avatar-placeholder">
                          <i className="ri-user-star-line"></i>
                        </div>
                      )}
                    </div>
                    <div className="level-badge-container">
                      <div className={`level-badge ${getLevelColor(leader.currentLevel ?? null)}`}>
                        <span className="level-number">{leader.currentLevel ?? 0}</span>
                        <span className="level-label">Level</span>
                      </div>
                    </div>
                  </div>
                  <div className="team-card-body">
                    <h3>
                      {leader.displayName}'s Team
                      <i className="ri-external-link-line tl-link-icon"></i>
                    </h3>
                    <p className="member-email">{leader.email}</p>
                  </div>
                </div>
              ) : (
                <div className="team-leader-info">
                  <div className="team-leader-avatar">
                    <div className="avatar-placeholder avatar-unassigned">
                      <i className="ri-user-unfollow-line"></i>
                    </div>
                  </div>
                  <div>
                    <h3 className="team-group-title">Unassigned</h3>
                    <p className="team-group-subtitle">Employees without a team leader</p>
                  </div>
                </div>
              )}
              <span className="team-group-count">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="team-grid">
              {members.map(renderMemberCard)}
            </div>
          </div>
        ))}
        </div>
      </>
    );
  }

  // Team leader view: flat grid
  return (
    <>
      {selectedMember && (
        <MemberDetailsModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
      <div className="my-team-tab">
      <div className="tab-header">
        <h2>
          <i className="ri-group-line"></i>
          My Team
        </h2>
        <p className="tab-description">
          {approvedMembers.length} team member{approvedMembers.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="team-grid">
        {approvedMembers.map(renderMemberCard)}
      </div>
      </div>
    </>
  );
}
