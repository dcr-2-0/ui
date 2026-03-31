import { useState } from 'react';
import { useTeamLeaders } from '../../hooks/useTeamLeaders';
import { uploadAchievementProofFile, ACCEPTED_PROOF_TYPES } from '../../hooks/useAchievements';
import { tech } from '../../data/catalog/tech';
import type { CatalogItem } from '../../data/types';
import './ProfileSetupModal.css';

interface ProfileSetupModalProps {
  onComplete: (data: ProfileSetupData) => Promise<void>;
  onCancel: () => void;
  isTeamLeader?: boolean;
  userId?: string;
}

export interface HistoricalAchievement {
  itemId: string;
  item: CatalogItem;
  completionDate: string;
  proofLink: string;
  notes?: string;
}

export interface ProfileSetupData {
  teamLeaderId?: string;
  teamLeaderName?: string;
  currentLevel: number;
  achievements: HistoricalAchievement[];
  preSystemPoints?: number;
}

/**
 * Modal for first-time profile setup
 * Employee: selects team leader, level, and adds historical achievements (submitted for approval)
 * Team Leader: selects level and adds historical achievements (saved immediately, no approval)
 */
export function ProfileSetupModal({ onComplete, onCancel, isTeamLeader = false, userId }: ProfileSetupModalProps) {
  const { teamLeaders, isLoading: loadingLeaders } = useTeamLeaders();
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [preSystemPoints, setPreSystemPoints] = useState<number>(0);
  const [achievements, setAchievements] = useState<HistoricalAchievement[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Achievement form state
  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState({
    itemId: '',
    completionDate: '',
    proofLink: '',
    notes: '',
  });
  const [proofUpload, setProofUpload] = useState<{
    isUploading: boolean;
    fileName?: string;
    filePath?: string;
    error?: string;
  }>({ isUploading: false });

  // Only Tech items for historical achievements
  const allCatalogItems = tech;

  const handleAddAchievement = () => {
    if (!newAchievement.itemId) {
      setError('Please select a certification');
      return;
    }

    // Check for duplicate
    const isDuplicate = achievements.some((a) => a.itemId === newAchievement.itemId);
    if (isDuplicate) {
      setError('This certification has already been added');
      return;
    }

    const item = allCatalogItems.find((i) => i.id === newAchievement.itemId);
    if (!item) {
      setError('Invalid item selected');
      return;
    }

    const achievement: HistoricalAchievement = {
      itemId: item.id,
      item,
      completionDate: newAchievement.completionDate,
      proofLink: newAchievement.proofLink,
      notes: newAchievement.notes || undefined,
    };

    setAchievements((prev) => [...prev, achievement]);
    setNewAchievement({ itemId: '', completionDate: '', proofLink: '', notes: '' });
    setShowAddAchievement(false);
    setError(null);
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
  };

  const resetAchievementForm = () => {
    setShowAddAchievement(false);
    setNewAchievement({ itemId: '', completionDate: '', proofLink: '', notes: '' });
    setProofUpload({ isUploading: false });
    setError(null);
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !newAchievement.itemId) return;
    setProofUpload({ isUploading: true });
    try {
      const { fileUrl, filePath, fileName } = await uploadAchievementProofFile(userId, newAchievement.itemId, file);
      setNewAchievement((prev) => ({ ...prev, proofLink: fileUrl }));
      setProofUpload({ isUploading: false, fileName, filePath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setProofUpload({ isUploading: false, error: msg });
    }
    // Reset file input value so the same file can be re-selected
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTeamLeader && !selectedTeamLeaderId) {
      setError('Please select a team leader');
      return;
    }

    // If the add-achievement sub-form is open with a cert selected, auto-add it
    // before submitting so the user doesn't lose their selection.
    let finalAchievements = achievements;
    if (showAddAchievement && newAchievement.itemId) {
      const item = allCatalogItems.find((i) => i.id === newAchievement.itemId);
      const isDuplicate = achievements.some((a) => a.itemId === newAchievement.itemId);
      if (item && !isDuplicate) {
        finalAchievements = [
          ...achievements,
          {
            itemId: item.id,
            item,
            completionDate: newAchievement.completionDate,
            proofLink: newAchievement.proofLink,
            notes: newAchievement.notes || undefined,
          },
        ];
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedLeader = teamLeaders.find((tl) => tl.uid === selectedTeamLeaderId);
      await onComplete({
        teamLeaderId: isTeamLeader ? undefined : selectedTeamLeaderId,
        teamLeaderName: isTeamLeader ? undefined : selectedLeader?.displayName,
        currentLevel: selectedLevel,
        achievements: finalAchievements,
        preSystemPoints: preSystemPoints > 0 ? preSystemPoints : undefined,
      });
    } catch (err) {
      console.error('[ProfileSetupModal] Error submitting:', err);
      setError('Failed to submit profile setup');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-setup-backdrop">
      <div className="profile-setup-modal">
        {/* Header */}
        <div className="profile-setup-header">
          <h2>
            <i className="ri-user-settings-line"></i>
            Setup Your Profile
          </h2>
          <p>
            {isTeamLeader
              ? 'Set your level and add any certifications you\'ve already completed'
              : 'Setup your profile and add any certifications you\'ve already completed'}
          </p>
        </div>

        {/* Content */}
        <div className="profile-setup-content">
          <form onSubmit={handleSubmit} className="profile-setup-form">
            {/* Team Leader Selection (employees only) */}
            {!isTeamLeader && (
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
                  disabled={isSubmitting}
                >
                  <option value="">
                    {loadingLeaders ? 'Loading...' : 'Select your team leader...'}
                  </option>
                  {teamLeaders.map((leader) => (
                    <option key={leader.uid} value={leader.uid}>
                      {leader.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current Level Selection */}
            <div className="form-group">
              <label htmlFor="current-level" className="form-label">
                <i className="ri-bar-chart-line"></i>
                What is your current level?
                <span className="required">*</span>
              </label>
              <select
                id="current-level"
                className="form-select"
                value={selectedLevel ?? 0}
                onChange={(e) => setSelectedLevel(parseInt(e.target.value, 10))}
                disabled={isSubmitting}
              >
                <option value={0}>No level yet</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>
              <p className="form-hint">
                Select your current level in the DCR program
              </p>
            </div>

            {/* Pre-System Points */}
            <div className="form-group">
              <label className="form-label">
                <i className="ri-coin-line"></i>
                Extra points from before Q1 2026
                <span className="form-label-optional"> (optional)</span>
              </label>
              <div className="points-stepper">
                <button
                  type="button"
                  className="points-stepper-btn"
                  onClick={() => setPreSystemPoints((p) => Math.max(0, p - 1))}
                  disabled={isSubmitting || preSystemPoints === 0}
                  aria-label="Decrease points"
                >
                  <i className="ri-subtract-line"></i>
                </button>
                <div className="points-stepper-display">
                  <input
                    type="number"
                    className="points-stepper-input"
                    min={0}
                    step={1}
                    value={preSystemPoints === 0 ? '' : preSystemPoints}
                    placeholder="0"
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setPreSystemPoints(isNaN(v) || v < 0 ? 0 : v);
                    }}
                    disabled={isSubmitting}
                    aria-label="Extra points"
                  />
                  <span className="points-stepper-unit">pts</span>
                </div>
                <button
                  type="button"
                  className="points-stepper-btn"
                  onClick={() => setPreSystemPoints((p) => p + 1)}
                  disabled={isSubmitting}
                  aria-label="Increase points"
                >
                  <i className="ri-add-line"></i>
                </button>
              </div>
              <p className="form-hint">
                Surplus points carried over from before the DCR portal launched. These count toward your current plan.
              </p>
            </div>

            {/* Historical Achievements */}
            <div className="form-section">
              <div className="section-header">
                <h3>
                  <i className="ri-trophy-line"></i>
                  Historical Achievements
                </h3>
                <p>Add Tech certifications you've already completed (or skip if none)</p>
              </div>

              {achievements.length > 0 && (
                <div className="achievements-list">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="achievement-item">
                      <div className="achievement-info">
                        <strong>{achievement.item.name}</strong>
                        <span className="achievement-meta">
                          {achievement.item.category} • {achievement.item.points} pts • Completed {new Date(achievement.completionDate).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-icon-danger"
                        onClick={() => handleRemoveAchievement(index)}
                        disabled={isSubmitting}
                        title="Remove"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showAddAchievement && (
                <button
                  type="button"
                  className="btn-add-achievement"
                  onClick={() => setShowAddAchievement(true)}
                  disabled={isSubmitting || achievements.length >= tech.length}
                  title={achievements.length >= tech.length ? 'All certifications have been added' : ''}
                >
                  <i className="ri-add-line"></i>
                  {achievements.length >= tech.length ? 'All Certifications Added' : 'Add Achievement'}
                </button>
              )}

              {showAddAchievement && (
                <div className="add-achievement-form">
                  <div className="form-group">
                    <label htmlFor="achievement-item" className="form-label-small">
                      Tech Certification *
                    </label>
                    <select
                      id="achievement-item"
                      className="form-select-small"
                      value={newAchievement.itemId}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({ ...prev, itemId: e.target.value }))
                      }
                    >
                      <option value="">Select certification...</option>
                      {tech
                        .filter((item) => !achievements.some((a) => a.itemId === item.id))
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.points} pts)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="completion-date" className="form-label-small">
                      Completion Date (Optional)
                    </label>
                    <input
                      type="date"
                      id="completion-date"
                      className="form-input-small"
                      value={newAchievement.completionDate}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({ ...prev, completionDate: e.target.value }))
                      }
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label-small">
                      Attachment (Optional)
                    </label>
                    {proofUpload.fileName ? (
                      <div className="proof-file-uploaded">
                        <i className="ri-file-check-line"></i>
                        <span className="proof-file-name">{proofUpload.fileName}</span>
                        <button
                          type="button"
                          className="proof-file-remove"
                          onClick={() => {
                            setProofUpload({ isUploading: false });
                            setNewAchievement((prev) => ({ ...prev, proofLink: '' }));
                          }}
                          title="Remove file"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="proof-input-row">
                        <input
                          type="url"
                          id="proof-link"
                          className="form-input-small"
                          placeholder="https://credly.com/..."
                          value={newAchievement.proofLink}
                          onChange={(e) =>
                            setNewAchievement((prev) => ({ ...prev, proofLink: e.target.value }))
                          }
                          disabled={proofUpload.isUploading}
                        />
                        {userId && (
                          <>
                            <span className="proof-or">or</span>
                            <label
                              className={`btn-upload-proof${!newAchievement.itemId || proofUpload.isUploading ? ' disabled' : ''}`}
                              title={!newAchievement.itemId ? 'Select a certification first' : 'Upload a file'}
                            >
                              {proofUpload.isUploading ? (
                                <><div className="spinner-tiny"></div> Uploading…</>
                              ) : (
                                <><i className="ri-upload-2-line"></i> Upload</>
                              )}
                              <input
                                type="file"
                                accept={ACCEPTED_PROOF_TYPES}
                                style={{ display: 'none' }}
                                disabled={!newAchievement.itemId || proofUpload.isUploading}
                                onChange={handleProofFileChange}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    )}
                    {proofUpload.error && (
                      <span className="proof-upload-error">{proofUpload.error}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="notes" className="form-label-small">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      className="form-textarea-small"
                      placeholder="Additional notes..."
                      rows={2}
                      value={newAchievement.notes}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({ ...prev, notes: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-actions-inline">
                    <button
                      type="button"
                      className="btn-secondary-small"
                      onClick={resetAchievementForm}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary-small"
                      onClick={handleAddAchievement}
                    >
                      <i className="ri-check-line"></i>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="info-box">
              <i className="ri-information-line"></i>
              <div>
                <p><strong>What happens next?</strong></p>
                {isTeamLeader ? (
                  <ul>
                    <li>Your profile and achievements will be saved immediately</li>
                    <li>No approval needed — you're a team leader</li>
                  </ul>
                ) : (
                  <ul>
                    <li>Your team leader will review your profile and achievements</li>
                    <li>They will approve or provide feedback</li>
                    <li>Once approved, you'll have full access to Real Plan features</li>
                  </ul>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="form-error">
                <i className="ri-error-warning-line"></i>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || (!isTeamLeader && !selectedTeamLeaderId)}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className={isTeamLeader ? 'ri-save-line' : 'ri-send-plane-line'}></i>
                    {isTeamLeader ? 'Save Profile' : 'Submit for Approval'}
                    {achievements.length > 0 && ` (${achievements.length} achievement${achievements.length !== 1 ? 's' : ''})`}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
