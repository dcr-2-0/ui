import { useState } from 'react';
import { useQuarterConfig } from '../../contexts/QuarterContext';
import { computeCurrentCalendarQuarter } from '../../utils/quarterUtils';

export function QuarterSettingsTab() {
  const { currentQuarter, isFrozen, setActiveQuarter } = useQuarterConfig();
  const [saving, setSaving] = useState(false);

  const calendarQuarter = computeCurrentCalendarQuarter();

  async function handleLock() {
    setSaving(true);
    try {
      await setActiveQuarter(calendarQuarter);
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    if (!confirm(`Release the lock? Everyone will immediately move to ${calendarQuarter}.`)) return;
    setSaving(true);
    try {
      await setActiveQuarter(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quarter-settings-tab">
      <div className="qs-card">
        <div className="qs-header">
          <i className="ri-calendar-lock-line"></i>
          <div>
            <h2>Quarter Control</h2>
            <p>Lock the active quarter so users can submit Q1 plans without being auto-transitioned when April starts.</p>
          </div>
        </div>

        <div className="qs-status-row">
          <div className="qs-status-item">
            <span className="qs-label">Effective quarter</span>
            <span className="qs-value">{currentQuarter}</span>
          </div>
          <div className="qs-status-item">
            <span className="qs-label">Calendar quarter</span>
            <span className="qs-value">{calendarQuarter}</span>
          </div>
          <div className="qs-status-item">
            <span className="qs-label">Status</span>
            {isFrozen ? (
              <span className="qs-badge qs-badge-locked">
                <i className="ri-lock-line"></i> Locked
              </span>
            ) : (
              <span className="qs-badge qs-badge-live">
                <i className="ri-calendar-line"></i> Calendar-driven
              </span>
            )}
          </div>
        </div>

        <div className="qs-actions">
          {isFrozen ? (
            <button className="qs-btn qs-btn-release" onClick={handleRelease} disabled={saving}>
              <i className="ri-lock-unlock-line"></i>
              {saving ? 'Releasing…' : `Release lock → ${calendarQuarter}`}
            </button>
          ) : (
            <button className="qs-btn qs-btn-lock" onClick={handleLock} disabled={saving}>
              <i className="ri-lock-line"></i>
              {saving ? 'Locking…' : `Lock to ${calendarQuarter}`}
            </button>
          )}
        </div>

        {isFrozen && calendarQuarter !== currentQuarter && (
          <div className="qs-notice">
            <i className="ri-information-line"></i>
            Calendar has moved to <strong>{calendarQuarter}</strong> but everyone still sees <strong>{currentQuarter}</strong>.
            Release the lock when you're ready to start the new quarter.
          </div>
        )}
      </div>
    </div>
  );
}
