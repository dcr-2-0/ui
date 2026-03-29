import { useState } from 'react';
import { MOCK_USERS, getActiveMockUserKey, setMockUser, setDevMode, resetDevData } from '../../data/mockUsers';
import './DevPanel.css';

export default function DevPanel() {
  const [expanded, setExpanded] = useState(false);
  const [devDate, setDevDate] = useState(() => localStorage.getItem('dcr-dev-date') ?? '');
  const currentKey = getActiveMockUserKey();
  const currentUser = MOCK_USERS.find((u) => u.key === currentKey);

  const handleUserChange = (key: string) => {
    setMockUser(key === '' ? null : key);
  };

  const handleDateChange = (value: string) => {
    setDevDate(value);
    if (value) {
      localStorage.setItem('dcr-dev-date', new Date(value).toISOString());
    } else {
      localStorage.removeItem('dcr-dev-date');
    }
    window.location.reload();
  };

  const handleDisable = () => {
    setDevMode(false);
  };

  const handleReset = async () => {
    if (!confirm('Reset all dev users to default state? This deletes plans, achievements, and notifications.')) return;
    await resetDevData();
    window.location.reload();
  };

  return (
    <div className={`dev-panel${expanded ? ' dev-panel--expanded' : ''}`}>
      <button
        className="dev-panel__toggle"
        onClick={() => setExpanded((e) => !e)}
        title="Dev Mode Panel"
      >
        <i className="ri-code-s-slash-line"></i>
        {!expanded && <span className="dev-panel__pill">DEV</span>}
      </button>

      {expanded && (
        <div className="dev-panel__body">
          <div className="dev-panel__header">
            <span className="dev-panel__title">
              <i className="ri-bug-line"></i> Dev Mode
            </span>
            <button className="dev-panel__disable" onClick={handleDisable} title="Disable dev mode">
              <i className="ri-close-line"></i>
            </button>
          </div>

          <div className="dev-panel__section">
            <label className="dev-panel__label">Active user</label>
            <select
              className="dev-panel__select"
              value={currentKey ?? ''}
              onChange={(e) => handleUserChange(e.target.value)}
            >
              <option value="">— Guest (not signed in) —</option>
              {MOCK_USERS.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.label}
                </option>
              ))}
            </select>
            {currentUser && (
              <p className="dev-panel__desc">{currentUser.description}</p>
            )}
          </div>

          {currentUser && (
            <div className="dev-panel__badges">
              <span className={`dev-panel__badge dev-panel__badge--role dev-panel__badge--${currentUser.profile.role}`}>
                {currentUser.profile.role}
              </span>
              <span className={`dev-panel__badge dev-panel__badge--status dev-panel__badge--${currentUser.profile.approvalStatus}`}>
                {currentUser.profile.approvalStatus}
              </span>
              {currentUser.profile.currentLevel != null && (
                <span className="dev-panel__badge">L{currentUser.profile.currentLevel}</span>
              )}
            </div>
          )}

          <div className="dev-panel__section">
            <label className="dev-panel__label">
              <i className="ri-calendar-line"></i> Simulated date
              <span className="dev-panel__hint"> (for quarter testing)</span>
            </label>
            <input
              className="dev-panel__input"
              type="date"
              value={devDate ? devDate.slice(0, 10) : ''}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            {devDate && (
              <button
                className="dev-panel__clear-date"
                onClick={() => handleDateChange('')}
              >
                <i className="ri-close-circle-line"></i> Clear (use today)
              </button>
            )}
          </div>

          <div className="dev-panel__uid">
            UID: <code>{currentUser?.authUser.uid ?? 'none'}</code>
          </div>

          <button className="dev-panel__reset" onClick={handleReset} title="Reset all mock users to default state">
            <i className="ri-refresh-line"></i> Reset all users
          </button>
        </div>
      )}
    </div>
  );
}
