import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { UserDocument } from '../../data/types';
import './WelcomeModal.css';

interface WelcomeModalProps {
  onSelectTeamLeader: (teamLeaderId: string, message?: string) => Promise<void>;
}

interface TeamLeader {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string;
}

/**
 * Modal shown to employees on first login
 * Lets them select their team leader
 * Non-dismissible until a team leader is selected
 */
export function WelcomeModal({ onSelectTeamLeader }: WelcomeModalProps) {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch team leaders on mount
  useEffect(() => {
    const fetchTeamLeaders = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'team_leader'));
        const snapshot = await getDocs(q);

        const leaders = snapshot.docs.map((doc) => {
          const data = doc.data() as UserDocument;
          return {
            uid: doc.id,
            displayName: data.displayName,
            photoURL: data.photoURL,
            email: data.email,
          };
        });

        // Sort alphabetically by name
        leaders.sort((a, b) => a.displayName.localeCompare(b.displayName));

        console.log('[WelcomeModal] Fetched team leaders:', leaders.length);
        setTeamLeaders(leaders);
        setIsLoading(false);
      } catch (err) {
        console.error('[WelcomeModal] Error fetching team leaders:', err);
        setError('Failed to load team leaders. Please refresh the page.');
        setIsLoading(false);
      }
    };

    fetchTeamLeaders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeamLeaderId) {
      setError('Please select a team leader');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      console.log('[WelcomeModal] Submitting team leader selection:', {
        teamLeaderId: selectedTeamLeaderId,
        hasMessage: !!message,
      });

      await onSelectTeamLeader(selectedTeamLeaderId, message || undefined);

      console.log('[WelcomeModal] Team leader selection submitted successfully');
    } catch (err) {
      console.error('[WelcomeModal] Error submitting:', err);
      setError('Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="welcome-modal-backdrop">
      <div className="welcome-modal-container">
        <div className="welcome-modal-card">
          {/* Header */}
          <div className="welcome-modal-header">
            <div className="welcome-modal-icon">
              <i className="ri-team-line"></i>
            </div>
            <h1 className="welcome-modal-title">Welcome to DCR 2.0!</h1>
            <p className="welcome-modal-subtitle">
              Let's get you started by connecting you with your team leader
            </p>
          </div>

          {/* Content */}
          <div className="welcome-modal-content">
            {isLoading ? (
              <div className="welcome-modal-loading">
                <div className="spinner"></div>
                <p>Loading team leaders...</p>
              </div>
            ) : error && teamLeaders.length === 0 ? (
              <div className="welcome-modal-error">
                <i className="ri-error-warning-line"></i>
                <p>{error}</p>
                <button
                  className="btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="welcome-modal-form">
                {/* Team Leader Selection */}
                <div className="form-group">
                  <label htmlFor="team-leader" className="form-label">
                    <i className="ri-user-star-line"></i>
                    Who is your team leader?
                    <span className="required">*</span>
                  </label>
                  <select
                    id="team-leader"
                    className="form-select"
                    value={selectedTeamLeaderId}
                    onChange={(e) => {
                      setSelectedTeamLeaderId(e.target.value);
                      setError(null);
                    }}
                    required
                  >
                    <option value="">Select a team leader...</option>
                    {teamLeaders.map((leader) => (
                      <option key={leader.uid} value={leader.uid}>
                        {leader.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Message */}
                <div className="form-group">
                  <label htmlFor="message" className="form-label">
                    <i className="ri-message-3-line"></i>
                    Message to team leader (optional)
                  </label>
                  <textarea
                    id="message"
                    className="form-textarea"
                    placeholder="Hi! I'm joining the team and looking forward to working with you..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    rows={3}
                    maxLength={200}
                  />
                  <div className="form-hint">
                    {message.length}/200 characters
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="form-error">
                    <i className="ri-error-warning-line"></i>
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn-primary btn-large"
                  disabled={isSubmitting || !selectedTeamLeaderId}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-small"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line"></i>
                      Request to Join Team
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="welcome-modal-footer">
            <p className="footer-text">
              <i className="ri-information-line"></i>
              Your team leader will review and approve your request
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
