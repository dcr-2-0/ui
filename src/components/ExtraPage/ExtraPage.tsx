import { useState } from 'react';
import type { CatalogItem, CertificationItem } from '../../data/types';
import './ExtraPage.css';

const SIZE_BONUS: Record<string, number> = {
  '3': 0.08,
  '4': 0.10,
  '5': 0.13,
  '6': 0.17,
  '7+': 0.22,
};

const RESERVIST_BONUS: Record<string, number> = {
  '0': 0,
  '1': 0.05,
  '2+': 0.10,
};

interface ExtraPageProps {
  onAddItem: (item: CatalogItem) => void;
  onToggleItem: (item: CatalogItem) => void;
  isInCart: (id: string) => boolean;
  certItems: CertificationItem[];
}

export default function ExtraPage({ onAddItem, onToggleItem, isInCart, certItems }: ExtraPageProps) {
  // Widget 1: Certification Renewal
  const [renewalCertId, setRenewalCertId] = useState('');

  // Widget 2: Certification Circle
  const [circleCertId, setCircleCertId] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [reservists, setReservists] = useState('0');

  // Computed values
  const renewalCert = certItems.find(c => c.id === renewalCertId) ?? null;
  const renewalPoints = renewalCert ? Math.ceil(renewalCert.points * 0.25) : 0;

  const eligibleCerts = certItems.filter(c => c.points >= 130);
  const circleCert = eligibleCerts.find(c => c.id === circleCertId) ?? null;
  const circleBonus =
    circleCert && groupSize
      ? Math.round(
          circleCert.points *
            ((SIZE_BONUS[groupSize] ?? 0) + (RESERVIST_BONUS[reservists] ?? 0))
        )
      : 0;

  const renewalItemId = renewalCertId ? `extra-renewal-${renewalCertId}` : '';
  const renewalInCart = renewalItemId ? isInCart(renewalItemId) : false;

  const handleToggleRenewal = () => {
    if (!renewalCert) return;
    onToggleItem({
      id: renewalItemId,
      name: `Cert Renewal: ${renewalCert.name}`,
      points: renewalPoints,
      image: renewalCert.image,
      category: 'tech',
      subcategory: 'Certification Renewal',
      description: `25% renewal bonus for ${renewalCert.name} (base: ${renewalCert.points} pts)`,
    });
  };

  const handleAddCircle = () => {
    if (!circleCert || !groupSize || circleBonus <= 0) return;
    if (!isInCart(circleCertId)) {
      onAddItem(circleCert);
    }
    const reservistLabel =
      reservists === '0' ? 'no reservists' : `${reservists} reservist${reservists === '1' ? '' : 's'}`;
    onAddItem({
      id: `extra-circle-${circleCertId}-${Date.now()}`,
      name: `Cert Circle: ${circleCert.name}`,
      points: circleBonus,
      image: circleCert.image,
      category: 'tech',
      subcategory: 'Certification Circle',
      description: `Group bonus — ${groupSize} people, ${reservistLabel}`,
    });
  };

  return (
    <div className="extra-page">
      <div className="extra-widgets-grid">

        {/* Widget 1: Certification Renewal */}
        <div className="extra-widget">
          <div className="extra-widget-icon renewal">
            <i className="ri-refresh-line"></i>
          </div>
          <h3 className="extra-widget-title">Certification renewal</h3>
          <p className="extra-widget-desc">
            Renewing a cert earns 25% of its base points
          </p>
          <div className="extra-widget-body">
            <select
              className="extra-select"
              value={renewalCertId}
              onChange={(e) => setRenewalCertId(e.target.value)}
            >
              <option value="">Select certification...</option>
              {certItems.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.name}
                </option>
              ))}
            </select>
            {renewalCert && (
              <p className="extra-calc-result">
                <span className="extra-calc-pts">{renewalPoints}</span>
                <span className="extra-calc-note">
                  {' '}pts &nbsp;·&nbsp; 25% of {renewalCert.points}
                </span>
              </p>
            )}
          </div>
          <button
            className={`extra-add-btn${renewalInCart ? ' added' : ''}`}
            onClick={handleToggleRenewal}
            disabled={!renewalCert}
          >
            <i className={renewalInCart ? 'ri-check-line' : 'ri-add-line'}></i>
            {renewalInCart ? 'Added' : 'Add to Plan'}
          </button>
        </div>

        {/* Widget 2: Certification Circle */}
        <div className="extra-widget">
          <div className="extra-widget-icon circle">
            <i className="ri-group-line"></i>
          </div>
          <h3 className="extra-widget-title">Certification circle</h3>
          <p className="extra-widget-desc">
            Group study bonus — more people means higher bonus points
          </p>
          <div className="extra-widget-body">
            <select
              className="extra-select"
              value={circleCertId}
              onChange={(e) => setCircleCertId(e.target.value)}
            >
              <option value="">Select certification (≥130 pts)...</option>
              {eligibleCerts.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.name}
                </option>
              ))}
            </select>

            <div className="extra-toggle-group">
              <span className="extra-toggle-label">Group size</span>
              <div className="extra-toggle-buttons">
                {['3', '4', '5', '6', '7+'].map((size) => (
                  <button
                    key={size}
                    className={`extra-toggle-btn${groupSize === size ? ' active' : ''}`}
                    onClick={() => setGroupSize(groupSize === size ? '' : size)}
                    title={`+${Math.round((SIZE_BONUS[size] ?? 0) * 100)}%`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="extra-toggle-group">
              <span className="extra-toggle-label">Reservists in group</span>
              <div className="extra-toggle-buttons">
                {(['0', '1', '2+'] as const).map((val) => (
                  <button
                    key={val}
                    className={`extra-toggle-btn${reservists === val ? ' active' : ''}`}
                    onClick={() => setReservists(val)}
                    title={val === '0' ? 'No reservist bonus' : `+${Math.round((RESERVIST_BONUS[val] ?? 0) * 100)}%`}
                  >
                    {val === '0' ? 'None' : val}
                  </button>
                ))}
              </div>
            </div>

            {circleCert && groupSize && (
              <p className="extra-calc-result">
                <span className="extra-calc-pts">{circleBonus}</span>
                <span className="extra-calc-note">
                  {' '}pts &nbsp;·&nbsp;
                  +{Math.round(((SIZE_BONUS[groupSize] ?? 0) + (RESERVIST_BONUS[reservists] ?? 0)) * 100)}%
                  {' '}of {circleCert.points}
                </span>
              </p>
            )}
          </div>
          <button
            className="extra-add-btn"
            onClick={handleAddCircle}
            disabled={!circleCert || !groupSize || circleBonus <= 0}
          >
            <i className="ri-add-line"></i>
            Add to Plan
          </button>
        </div>

      </div>
    </div>
  );
}
