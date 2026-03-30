import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import type { UserDocument } from '../../data/types';
import './PendingApprovalPage.css';

interface PendingApprovalPageProps {
  teamLeaderId: string;
  requestDate: string;
  onChangeTeamLeader: () => void;
  onUseSimulator: () => void;
}

/**
 * Full-page waiting screen shown while employee's team membership is pending
 * Displays team leader info and allows changing selection
 */
export function PendingApprovalPage({
  teamLeaderId,
  requestDate,
  onChangeTeamLeader,
  onUseSimulator,
}: PendingApprovalPageProps) {
  const [teamLeader, setTeamLeader] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch team leader details
  useEffect(() => {
    const fetchTeamLeader = async () => {
      try {
        setIsLoading(true);
        const teamLeaderRef = doc(db, 'users', teamLeaderId);
        const teamLeaderDoc = await getDoc(teamLeaderRef);

        if (teamLeaderDoc.exists()) {
          setTeamLeader(teamLeaderDoc.data() as UserDocument);
        }

        console.log('[PendingApprovalPage] Fetched team leader:', {
          teamLeaderId,
          exists: teamLeaderDoc.exists(),
        });

        setIsLoading(false);
      } catch (err) {
        console.error('[PendingApprovalPage] Error fetching team leader:', err);
        setIsLoading(false);
      }
    };

    fetchTeamLeader();
  }, [teamLeaderId]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('[PendingApprovalPage] User signed out');
    } catch (err) {
      console.error('[PendingApprovalPage] Error signing out:', err);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-approval-container">
        <div className="pending-approval-card">
          {/* Status Icon */}
          <div className="pending-icon-wrapper">
            <div className="pending-icon">
              <i className="ri-time-line"></i>
            </div>
            <div className="pending-pulse"></div>
          </div>

          {/* Header */}
          <h1 className="pending-title">Approval Pending</h1>
          <p className="pending-subtitle">
            Your request to join a team is being reviewed
          </p>

          {/* Team Leader Info */}
          {isLoading ? (
            <div className="pending-loading">
              <div className="spinner"></div>
              <p>Loading team leader information...</p>
            </div>
          ) : teamLeader ? (
            <div className="team-leader-info">
              <div className="team-leader-avatar">
                {teamLeader.photoURL ? (
                  <img
                    src={teamLeader.photoURL}
                    alt={teamLeader.displayName}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="ri-user-line"></i>
                  </div>
                )}
              </div>
              <div className="team-leader-details">
                <h3>{teamLeader.displayName}</h3>
                <p className="team-leader-email">{teamLeader.email}</p>
                <p className="team-leader-role">
                  <i className="ri-shield-user-line"></i>
                  Team Leader
                </p>
              </div>
            </div>
          ) : (
            <div className="team-leader-info">
              <p className="error-text">
                <i className="ri-error-warning-line"></i>
                Could not load team leader information
              </p>
            </div>
          )}

          {/* Request Info */}
          <div className="request-info">
            <div className="info-item">
              <i className="ri-calendar-line"></i>
              <div>
                <p className="info-label">Request sent</p>
                <p className="info-value">{formatDate(requestDate)}</p>
              </div>
            </div>
            <div className="info-item">
              <i className="ri-mail-send-line"></i>
              <div>
                <p className="info-label">Status</p>
                <p className="info-value status-pending">
                  <span className="status-dot"></span>
                  Waiting for approval
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="pending-instructions">
            <h3>
              <i className="ri-lightbulb-line"></i>
              What happens next?
            </h3>
            <ul>
              <li>
                <i className="ri-check-line"></i>
                Your team leader will review your submitted level and certifications
              </li>
              <li>
                <i className="ri-check-line"></i>
                Once approved, you'll gain full access to DCR 2.0
              </li>
              <li>
                <i className="ri-check-line"></i>
                You'll be able to track achievements and plan quarterly goals
              </li>
            </ul>
          </div>

          {/* Simulator note */}
          <div className="pending-simulator-note">
            <i className="ri-gamepad-line"></i>
            <div className="pending-simulator-text">
              <p>In the meantime, feel free to explore the <strong>Simulator</strong> and plan your certification path</p>
              <button className="btn-simulator" onClick={onUseSimulator}>
                <i className="ri-gamepad-line"></i>
                Try the Simulator
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pending-actions">
            <button
              className="btn-secondary"
              onClick={onChangeTeamLeader}
              title="Select a different team leader"
            >
              <i className="ri-user-settings-line"></i>
              Change submitted info
            </button>
            <button
              className="btn-signout"
              onClick={handleSignOut}
              title="Sign out of your account"
            >
              <i className="ri-logout-box-line"></i>
              Sign Out
            </button>
          </div>

          {/* Footer Note */}
          <div className="pending-footer">
            <p>
              <i className="ri-information-line"></i>
              This page will automatically update when your request is approved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
