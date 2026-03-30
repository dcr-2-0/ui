import type { CatalogItem, CertificationItem } from '../../data/types';
import './CatalogCard.css';

interface CatalogCardProps {
  item: CatalogItem;
  inCart: boolean;
  onToggle: (item: CatalogItem) => void;
  isAchieved?: boolean;
  planItemStatus?: 'pending' | 'approved';
  onCardClick?: (item: CatalogItem) => void;
  quantity?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

export default function CatalogCard({
  item,
  inCart,
  onToggle,
  isAchieved = false,
  planItemStatus,
  onCardClick,
  quantity = 0,
  onIncrement,
  onDecrement,
}: CatalogCardProps) {
  const unitPoints = item.promotedPoints ?? item.points;
  const isPendingPlan = planItemStatus === 'pending';
  const isApprovedPlan = planItemStatus === 'approved';
  const isLocked = isPendingPlan || isApprovedPlan;

  // Derive subtitle from cert-specific fields
  const certItem = item as CertificationItem;
  const subtitle: string | undefined = item.category === 'tech'
    ? certItem.provider
    : undefined;

  const cardClass = [
    'catalog-card',
    inCart && !isLocked ? 'in-cart' : '',
    isPendingPlan ? 'in-pending-plan' : '',
    isApprovedPlan ? 'in-approved-plan' : '',
    isAchieved ? 'achieved' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass} onClick={() => onCardClick?.(item)}>
      {/* Top: full-width image */}
      <div className="catalog-card-top">
        <div className="catalog-card-logo">
          {item.image ? (
            <img src={item.image} alt={item.name} />
          ) : (
            <i className="ri-award-line"></i>
          )}
        </div>
        {/* Status badges (Required / Promoted / Achieved only — no level/category) */}
        <div className="catalog-card-badges">
          {isAchieved && (
            <span className="catalog-card-badge badge-achieved">
              <i className="ri-checkbox-circle-fill"></i> Done
            </span>
          )}
          {!isAchieved && (inCart || isPendingPlan || isApprovedPlan) && (
            <span className={`catalog-card-badge ${isApprovedPlan ? 'badge-approved-plan' : isPendingPlan ? 'badge-pending-plan' : 'badge-in-plan'}`}>
              <i className="ri-time-line"></i> {isApprovedPlan ? 'This Q' : isPendingPlan ? 'TL Approval' : 'In plan'}
            </span>
          )}
          {!isAchieved && item.required && (
            <span className="catalog-card-badge badge-required">Required</span>
          )}
          {!isAchieved && item.promoted && !item.required && (
            <span className="catalog-card-badge badge-promoted">Promoted</span>
          )}
        </div>
      </div>

      {/* Name + subtitle */}
      <div className="catalog-card-content">
        <h3 className="catalog-card-name">{item.name}</h3>
        {subtitle && <p className="catalog-card-sub">{subtitle}</p>}
      </div>

      {/* Footer: points + action */}
      <div className="catalog-card-footer">
        <div className="catalog-card-points">
          <i className="ri-star-fill catalog-card-star"></i>
          {item.promoted && item.promotedPoints ? (
            <>
              <span className="points-original">{item.points}</span>
              <span className="points-promoted">{item.promotedPoints}</span>
            </>
          ) : (
            <span className="points-value">{unitPoints}</span>
          )}
          <span className="catalog-card-pts">PTS</span>
          {item.repeatable && quantity > 1 && (
            <span className="catalog-card-qty-total"><span className="catalog-card-qty-count-inline">×{quantity}</span> ({quantity * unitPoints} total)</span>
          )}
        </div>

        {/* Action button / controls */}
        {isAchieved ? (
          <div className="catalog-action-icon achieved" title="Already achieved">
            <i className="ri-checkbox-circle-fill"></i>
          </div>
        ) : isPendingPlan ? (
          <div className="catalog-action-icon pending" title="Waiting for team leader approval">
            <i className="ri-user-line"></i>
          </div>
        ) : isApprovedPlan ? (
          <div className="catalog-action-icon locked" title="Locked in approved plan">
            <i className="ri-time-line"></i>
          </div>
        ) : item.repeatable ? (
          quantity > 0 ? (
            <div className="catalog-qty-controls" onClick={(e) => e.stopPropagation()}>
              <button className="catalog-qty-btn" onClick={onDecrement} title="Remove one">
                <i className="ri-subtract-line"></i>
              </button>
              <span className="catalog-qty-count">{quantity}</span>
              <button className="catalog-qty-btn" onClick={onIncrement} title="Add one more">
                <i className="ri-add-line"></i>
              </button>
            </div>
          ) : (
            <button
              className="catalog-add-btn"
              onClick={(e) => { e.stopPropagation(); onToggle(item); }}
              title="Add to plan"
            >
              <i className="ri-add-line"></i>
            </button>
          )
        ) : (
          <button
            className={`catalog-add-btn${inCart ? ' added' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(item); }}
            title={inCart ? 'Remove from plan' : 'Add to plan'}
          >
            <i className={inCart ? 'ri-check-line' : 'ri-add-line'}></i>
          </button>
        )}
      </div>
    </div>
  );
}
