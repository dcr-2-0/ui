import { useState, useMemo } from 'react';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useLevelUpRequests } from '../../hooks/useLevelUpRequests';
import { PendingApprovalsTab } from './PendingApprovalsTab';
import { MyTeamTab } from './MyTeamTab';
import { LevelUpsTab, type LevelUpHistoryRow } from './LevelUpsTab';
import type { UserDocument } from '../../data/types';
import './TeamLeaderDashboard.css';

interface TeamLeaderDashboardProps {
  userId: string;
  userDisplayName?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

type TabId = 'pending' | 'team' | 'levelups';

/**
 * Team Leader / Admin Dashboard - Manage team members and approvals
 * Team leaders see their team; admins see ALL employees across all teams
 */
export function TeamLeaderDashboard({ userId, userDisplayName = '', userEmail = '', isAdmin = false }: TeamLeaderDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('team');
  const { teamMembers, teamLeaders, isLoading, error } = useTeamMembers(userId, isAdmin);
  const { requests: levelUpRequests, isLoading: levelUpsLoading } = useLevelUpRequests(userId, isAdmin);
  const pendingLevelUps = levelUpRequests.filter((r) => r.status === 'pending');

  // Admin: only TLs whose own quarterly plans are pending admin approval
  // TL: employee registrations + employee plan submissions + completion reviews
  const pendingMembers = isAdmin
    ? teamLeaders.filter((tl) => tl.plan?.planStatus === 'pending')
    : [
        ...teamMembers.filter((m) => m.approvalStatus === 'pending'),
        ...teamMembers.filter((m) => m.approvalStatus === 'approved' && m.plan?.planStatus === 'pending'),
        ...teamMembers.filter((m) => m.approvalStatus === 'approved' && m.plan?.completionStatus === 'pending_review'),
      ] as (UserDocument & { uid: string })[];
  const approvedMembers = teamMembers.filter((m) => m.approvalStatus === 'approved') as (UserDocument & { uid: string })[];

  // Admin only: flat chronological history of all approved level-ups across all users
  const allLevelHistory = useMemo<LevelUpHistoryRow[] | undefined>(() => {
    if (!isAdmin) return undefined;
    const allUsers = [
      ...approvedMembers.map((u) => ({ ...u, role: 'employee' as const })),
      ...teamLeaders.map((u) => ({ ...u, role: 'team_leader' as const })),
    ];
    const rows: LevelUpHistoryRow[] = [];
    for (const user of allUsers) {
      const history = user.levelHistory ?? [];
      history.forEach((entry, idx) => {
        rows.push({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          levelFrom: idx > 0 ? history[idx - 1].level : null,
          levelTo: entry.level,
          date: entry.date,
          quarter: entry.quarter,
        });
      });
    }
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [isAdmin, approvedMembers, teamLeaders]);

  return (
    <div className="team-leader-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-icon">
            <i className="ri-team-line"></i>
          </div>
          <div className="header-text">
            <h1>{isAdmin ? 'Admin Dashboard' : 'Team Dashboard'}</h1>
            <p>{isAdmin ? 'Manage all employees and approvals across all teams' : 'Manage your team members and approvals'}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <i className="ri-group-line"></i>
            <div className="stat-content">
              <p className="stat-label">Team Members</p>
              <p className="stat-value">{approvedMembers.length}</p>
            </div>
          </div>
          <div className="stat-card stat-warning">
            <i className="ri-time-line"></i>
            <div className="stat-content">
              <p className="stat-label">Pending Approvals</p>
              <p className="stat-value">{pendingMembers.length + (isAdmin ? pendingLevelUps.length : 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <i className="ri-group-line"></i>
          {isAdmin ? 'All Teams' : 'My Team'}
          {approvedMembers.length > 0 && (
            <span className="tab-count">({approvedMembers.length})</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <i className="ri-time-line"></i>
          Pending Approvals
          {(pendingMembers.length + (isAdmin ? pendingLevelUps.length : 0)) > 0 && (
            <span className="tab-badge">{pendingMembers.length + (isAdmin ? pendingLevelUps.length : 0)}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'levelups' ? 'active' : ''}`}
          onClick={() => setActiveTab('levelups')}
        >
          <i className="ri-medal-line"></i>
          Level Ups
          {!isAdmin && pendingLevelUps.length > 0 && <span className="tab-badge">{pendingLevelUps.length}</span>}
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading team members...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <i className="ri-error-warning-line"></i>
            <p>{error}</p>
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'pending' && (
              <PendingApprovalsTab
                pendingMembers={pendingMembers}
                teamLeaderId={userId}
                teamLeaderName={userDisplayName}
                teamLeaderEmail={userEmail}
                pendingLevelUps={isAdmin ? pendingLevelUps : undefined}
                adminUid={isAdmin ? userId : undefined}
              />
            )}
            {activeTab === 'team' && (
              <MyTeamTab
                approvedMembers={approvedMembers}
                isAdmin={isAdmin}
                teamLeaders={teamLeaders}
              />
            )}
            {activeTab === 'levelups' && (
              <LevelUpsTab
                requests={isAdmin ? [] : levelUpRequests}
                isLoading={levelUpsLoading}
                adminUid={isAdmin ? userId : undefined}
                isAdmin={isAdmin}
                allLevelHistory={allLevelHistory}
                approvedRequests={isAdmin ? levelUpRequests.filter((r) => r.status === 'approved') : undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
