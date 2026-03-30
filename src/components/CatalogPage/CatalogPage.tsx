import { useState, useMemo, useEffect, useCallback } from 'react';
import type { CatalogItem, CertificationItem, RoadmapItem, RoadmapCert } from '../../data/types';
import type { AuthUser } from '../../hooks/useAuth';
import { SKILL_TAGS, PROVIDER_TAGS } from '../../data/catalog/tags';
import CatalogCard from './CatalogCard';
import ItemComments from './ItemComments';
import './CatalogPage.css';

type SortOption = 'category' | 'points-desc' | 'points-asc';
type ViewMode = 'grid' | 'list';

interface CatalogPageProps {
  items: CatalogItem[];
  onToggleItem: (item: CatalogItem) => void;
  isInCart: (itemId: string) => boolean;
  getQuantity?: (itemId: string) => number;
  onAddItem?: (item: CatalogItem) => void;
  onRemoveItem?: (itemId: string) => void;
  isAchieved?: (itemId: string) => boolean;
  getPlanItemStatus?: (itemId: string) => 'pending' | 'approved' | undefined;
  onAddAllRequired?: () => void;
  hasRequired?: boolean;
  openItemId?: string | null;
  onOpenItemConsumed?: () => void;
  onNavigateToCert?: (certId: string, roadmapId: string, roadmapName: string) => void;
  modalBackNav?: { label: string; onClick: () => void };
  authUser?: AuthUser | null;
}

export default function CatalogPage({
  items,
  onToggleItem,
  isInCart,
  getQuantity,
  onAddItem,
  onRemoveItem,
  isAchieved,
  getPlanItemStatus,
  onAddAllRequired,
  hasRequired,
  openItemId,
  onOpenItemConsumed,
  onNavigateToCert,
  modalBackNav,
  authUser,
}: CatalogPageProps) {
  const [sort, setSort] = useState<SortOption>('category');
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [hideAchieved, setHideAchieved] = useState(false);

  const toggleTag = useCallback((id: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const closeModal = useCallback(() => {
    setSelectedItem(null);
    modalBackNav?.onClick();
  }, [modalBackNav]);

  useEffect(() => {
    if (!selectedItem) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedItem, closeModal]);

  useEffect(() => {
    if (!openItemId) return;
    const item = items.find((i) => i.id === openItemId);
    if (item) setSelectedItem(item);
    onOpenItemConsumed?.();
  }, [openItemId, items, onOpenItemConsumed]);

  const hasTags = useMemo(() => items.some((item) => item.tags && item.tags.length > 0), [items]);

  const achievedCount = useMemo(
    () => items.filter((item) => isAchieved?.(item.id)).length,
    [items, isAchieved],
  );

  const filtered = useMemo(() => {
    let result = items;
    if (hideAchieved) {
      result = result.filter((item) => !isAchieved?.(item.id));
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          item.subcategory?.toLowerCase().includes(lower),
      );
    }
    if (selectedTags.size > 0) {
      result = result.filter((item) => item.tags?.some((t) => selectedTags.has(t)));
    }
    return result;
  }, [items, search, selectedTags, hideAchieved, isAchieved]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case 'points-desc':
        return copy.sort((a, b) => (b.promotedPoints ?? b.points) - (a.promotedPoints ?? a.points));
      case 'points-asc':
        return copy.sort((a, b) => (a.promotedPoints ?? a.points) - (b.promotedPoints ?? b.points));
      default:
        return copy;
    }
  }, [filtered, sort]);

  const allRequiredInCart = hasRequired && items.filter((i) => i.required).every((i) => isInCart(i.id));

  const handleListToggle = (item: CatalogItem) => {
    if (item.repeatable && onAddItem && onRemoveItem) {
      if (isInCart(item.id)) {
        onRemoveItem(item.id);
      } else {
        onAddItem(item);
      }
    } else {
      onToggleItem(item);
    }
  };

  return (
    <div className="catalog-page">
      <div className="catalog-toolbar">
        {/* Left: search + achieved toggle */}
        <div className="catalog-toolbar-left">
          <div className="catalog-search-wrapper">
            <i className="ri-search-line catalog-search-icon"></i>
            <input
              type="text"
              className="catalog-search"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="catalog-search-clear" onClick={() => setSearch('')}>
                <i className="ri-close-line"></i>
              </button>
            )}
          </div>
          {achievedCount > 0 && (
            <button
              className={`catalog-achieved-toggle${hideAchieved ? ' active' : ''}`}
              onClick={() => setHideAchieved((v) => !v)}
              title={hideAchieved ? 'Show achieved items' : 'Hide achieved items'}
            >
              <i className={hideAchieved ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
              {hideAchieved ? `${achievedCount} hidden` : `${achievedCount} achieved`}
            </button>
          )}
        </div>

        {/* Right: add-required + sort + view */}
        <div className="catalog-toolbar-right">
          {hasRequired && onAddAllRequired && !allRequiredInCart && (
            <button className="catalog-add-all-btn" onClick={onAddAllRequired}>
              <i className="ri-add-circle-line"></i> Add Required
            </button>
          )}
          <div className="catalog-sort-group">
            <span className="catalog-sort-label">Sort By:</span>
            <select
              className="catalog-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              <option value="category">Category Order</option>
              <option value="points-desc">Points: High to Low</option>
              <option value="points-asc">Points: Low to High</option>
            </select>
          </div>
          <div className="catalog-view-toggle">
            <button
              className={`catalog-view-btn${view === 'grid' ? ' active' : ''}`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <i className="ri-grid-fill"></i>
            </button>
            <button
              className={`catalog-view-btn${view === 'list' ? ' active' : ''}`}
              onClick={() => setView('list')}
              title="List view"
            >
              <i className="ri-list-check"></i>
            </button>
          </div>
        </div>
      </div>

      {hasTags && (
        <div className="catalog-tag-filters">
          <div className="catalog-tag-groups">
            <div className="catalog-tag-group">
              <span className="catalog-tag-group-label">Topic</span>
              <div className="catalog-tag-pills">
                {SKILL_TAGS.map((tag) => {
                  const active = selectedTags.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`catalog-tag-pill${active ? ' active' : ''}`}
                      style={active ? { background: tag.color, borderColor: tag.color } : undefined}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <i className={tag.icon} style={active ? {} : { color: tag.color }}></i>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="catalog-tag-group">
              <span className="catalog-tag-group-label">Provider</span>
              <div className="catalog-tag-pills">
                {PROVIDER_TAGS.map((tag) => {
                  const active = selectedTags.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={`catalog-tag-pill${active ? ' active' : ''}`}
                      style={active ? { background: tag.color, borderColor: tag.color } : undefined}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <i className={tag.icon} style={active ? {} : { color: tag.color }}></i>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {selectedTags.size > 0 && (
            <button className="catalog-tag-clear" onClick={() => setSelectedTags(new Set())}>
              <i className="ri-close-circle-line"></i> Clear filters
            </button>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="catalog-empty">
          <i className="ri-search-line"></i>
          <p>No items match &ldquo;{search}&rdquo;</p>
        </div>
      ) : view === 'grid' ? (
        <div className="catalog-grid">
          {sorted.map((item) => {
            const qty = getQuantity?.(item.id) ?? 0;
            return (
              <CatalogCard
                key={item.id}
                item={item}
                inCart={isInCart(item.id)}
                onToggle={onToggleItem}
                isAchieved={isAchieved?.(item.id) ?? false}
                planItemStatus={getPlanItemStatus?.(item.id)}
                onCardClick={setSelectedItem}
                quantity={qty}
                onIncrement={onAddItem ? () => onAddItem(item) : undefined}
                onDecrement={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="catalog-list">
          {sorted.map((item) => {
            const achieved = isAchieved?.(item.id) ?? false;
            const qty = getQuantity?.(item.id) ?? 0;
            const inCart = isInCart(item.id);
            const planStatus = getPlanItemStatus?.(item.id);
            const isPendingPlan = planStatus === 'pending';
            const isApprovedPlan = planStatus === 'approved';
            const isLocked = isPendingPlan || isApprovedPlan;
            return (
              <div
                className={`catalog-list-item${inCart && !isLocked ? ' in-cart' : ''}${isPendingPlan ? ' in-pending-plan' : ''}${isApprovedPlan ? ' in-approved-plan' : ''}${achieved ? ' achieved' : ''}`}
                key={item.id}
                onClick={() => setSelectedItem(item)}
              >
                {achieved ? (
                  <div className="catalog-list-achieved" title="Already achieved">
                    <i className="ri-checkbox-circle-fill"></i>
                  </div>
                ) : isPendingPlan ? (
                  <button className="catalog-list-add pending" title="Waiting for team leader approval" disabled>
                    <i className="ri-user-line"></i>
                  </button>
                ) : isApprovedPlan ? (
                  <button className="catalog-list-add locked" title="Locked in approved plan" disabled>
                    <i className="ri-time-line"></i>
                  </button>
                ) : item.repeatable && onAddItem && onRemoveItem ? (
                  qty > 0 ? (
                    <div className="catalog-list-qty" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="catalog-list-qty-btn"
                        onClick={() => onRemoveItem(item.id)}
                        title="Remove one"
                      >
                        <i className="ri-subtract-line"></i>
                      </button>
                      <span className="catalog-list-qty-count">{qty}</span>
                      <button
                        className="catalog-list-qty-btn"
                        onClick={() => onAddItem(item)}
                        title="Add one more"
                      >
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                  ) : (
                    <button
                      className="catalog-list-add"
                      onClick={(e) => { e.stopPropagation(); onAddItem(item); }}
                      title="Add to plan"
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  )
                ) : (
                  <button
                    className={`catalog-list-add${inCart ? ' added' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleListToggle(item); }}
                    title={inCart ? 'Remove from plan' : 'Add to plan'}
                  >
                    <i className={inCart ? 'ri-check-line' : 'ri-add-line'}></i>
                  </button>
                )}
                <div className="catalog-list-info">
                  <span className="catalog-list-name">{item.name}</span>
                  {item.subcategory && (
                    <span className="catalog-list-sub">{item.subcategory}</span>
                  )}
                </div>
                <div className="catalog-list-badges">
                  {achieved && <span className="catalog-list-badge achieved">Achieved</span>}
                  {!achieved && item.required && <span className="catalog-list-badge required">Required</span>}
                  {!achieved && item.promoted && !item.required && (
                    <span className="catalog-list-badge promoted">Promoted</span>
                  )}
                </div>
                <div className="catalog-list-points">
                  {item.promoted && item.promotedPoints ? (
                    <>
                      <span className="points-original">{item.points}</span>
                      <span className="points-promoted">{item.promotedPoints}</span>
                    </>
                  ) : (
                    <span className="points-value">{item.points}</span>
                  )}
                  <span className="catalog-list-pts-label">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedItem && (() => {
        const cert = selectedItem.category === 'tech' ? selectedItem as CertificationItem : null;
        const roadmap = selectedItem.category === 'roadmaps' ? selectedItem as RoadmapItem : null;

        // Build ordered slots: single cert or a choice group (pick one)
        type CertSlot = { type: 'single'; cert: RoadmapCert } | { type: 'choice'; group: string; certs: RoadmapCert[] };
        const certSlots: CertSlot[] = [];
        const seenGroups = new Set<string>();
        for (const rc of roadmap?.requiredCerts ?? []) {
          if (rc.choiceGroup) {
            if (!seenGroups.has(rc.choiceGroup)) {
              seenGroups.add(rc.choiceGroup);
              certSlots.push({ type: 'choice', group: rc.choiceGroup, certs: (roadmap!.requiredCerts!).filter(c => c.choiceGroup === rc.choiceGroup) });
            }
          } else {
            certSlots.push({ type: 'single', cert: rc });
          }
        }

        // Total points: min and max across choice groups
        const hasChoices = certSlots.some(slot => slot.type === 'choice');
        const minPoints = certSlots.reduce((sum, slot) =>
          sum + (slot.type === 'single' ? slot.cert.points : Math.min(...slot.certs.map(c => c.points))), 0);
        const maxPoints = certSlots.reduce((sum, slot) =>
          sum + (slot.type === 'single' ? slot.cert.points : Math.max(...slot.certs.map(c => c.points))), 0);
        return (
          <div className="catalog-modal-backdrop" onClick={closeModal}>
            <div className="catalog-modal" onClick={(e) => e.stopPropagation()}>
              <div className="catalog-modal-topbar" />
              <div className="catalog-modal-body">
                <button className="catalog-modal-close" onClick={closeModal} title="Close">
                  <i className="ri-close-line"></i>
                </button>

                <div className="catalog-modal-header">
                  <div className="catalog-modal-icon">
                    {selectedItem.image ? (
                      <img src={selectedItem.image} alt={selectedItem.name} />
                    ) : (
                      <i className="ri-award-line"></i>
                    )}
                  </div>
                  <div className="catalog-modal-title-block">
                    <h2 className="catalog-modal-name">{selectedItem.name}</h2>
                    {selectedItem.subcategory && (
                      <span className="catalog-modal-sub">{selectedItem.subcategory}</span>
                    )}
                    <p className="catalog-modal-points">
                      {selectedItem.promoted && selectedItem.promotedPoints ? (
                        <>
                          <span className="points-original">{selectedItem.points}</span>{' '}
                          <span className="points-promoted">{selectedItem.promotedPoints} pts</span>
                        </>
                      ) : (
                        <span className="points-value">{selectedItem.points} pts</span>
                      )}
                    </p>
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="catalog-modal-tags">
                        {[...SKILL_TAGS, ...PROVIDER_TAGS]
                          .filter((t) => selectedItem.tags!.includes(t.id))
                          .map((t) => (
                            <span
                              key={t.id}
                              className="catalog-modal-tag"
                              style={{
                                background: `${t.color}1a`,
                                borderColor: `${t.color}50`,
                                color: t.color,
                              }}
                            >
                              <i className={t.icon}></i>
                              {t.label}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedItem.description && (
                  <p className="catalog-modal-description">{selectedItem.description}</p>
                )}

                {roadmap?.requiredCerts && roadmap.requiredCerts.length > 0 && (
                  <div className="catalog-modal-roadmap-certs">
                    <h4 className="catalog-modal-section-title">
                      <i className="ri-file-list-3-line"></i> Required Certifications ({certSlots.length})
                    </h4>
                    <div className="catalog-modal-cert-list">
                      {certSlots.map((slot) => {
                        const renderCertRow = (rc: RoadmapCert) => (
                          <div
                            key={rc.id}
                            className={`catalog-modal-cert-row${onNavigateToCert ? ' catalog-modal-cert-row--clickable' : ''}`}
                            onClick={onNavigateToCert ? () => { closeModal(); onNavigateToCert(rc.id, selectedItem.id, selectedItem.name); } : undefined}
                          >
                            {rc.image ? (
                              <img src={rc.image} alt={rc.name} className="catalog-modal-cert-row-img" />
                            ) : (
                              <div className="catalog-modal-cert-row-img catalog-modal-cert-row-img--placeholder">
                                <i className="ri-award-line"></i>
                              </div>
                            )}
                            <span className="catalog-modal-cert-row-name">{rc.name}</span>
                            <span className="catalog-modal-cert-row-points">{rc.points} pts</span>
                            <i className="ri-arrow-right-line catalog-modal-cert-row-arrow"></i>
                          </div>
                        );
                        if (slot.type === 'single') return renderCertRow(slot.cert);
                        return (
                          <div key={slot.group} className="catalog-modal-cert-choice-group">
                            <div className="catalog-modal-cert-choice-label">
                              <i className="ri-git-branch-line"></i> Pick one
                            </div>
                            {slot.certs.map((c, i) => (
                              <div key={c.id}>
                                {i > 0 && <div className="catalog-modal-cert-or"><span>OR</span></div>}
                                {renderCertRow(c)}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    <div className="catalog-modal-cert-total">
                      <strong>Total Points:</strong>
                      <span>
                        {hasChoices && minPoints !== maxPoints
                          ? `(${minPoints}–${maxPoints})`
                          : maxPoints
                        } + {roadmap.points} roadmap badge
                      </span>
                    </div>
                  </div>
                )}

                {cert && (
                  <div className="catalog-modal-cert-details">
                    <h4 className="catalog-modal-section-title">
                      <i className="ri-file-list-3-line"></i> Exam Details
                    </h4>
                    <div className="catalog-modal-details-grid">
                      {cert.examCode && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Exam Code</span>
                          <span className="detail-value detail-mono">{cert.examCode}</span>
                        </div>
                      )}
                      {cert.price !== undefined && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Price</span>
                          <span className="detail-value">
                            {cert.price === 0 ? 'Free' : `$${cert.price} USD`}
                          </span>
                        </div>
                      )}
                      {cert.duration && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Duration</span>
                          <span className="detail-value">{cert.duration}</span>
                        </div>
                      )}
                      {cert.questions && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Questions</span>
                          <span className="detail-value">{cert.questions}</span>
                        </div>
                      )}
                      {cert.passingScore && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Passing Score</span>
                          <span className="detail-value">{cert.passingScore}</span>
                        </div>
                      )}
                      {cert.validity && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Validity</span>
                          <span className="detail-value">{cert.validity}</span>
                        </div>
                      )}
                      {cert.proctored !== undefined && (
                        <div className="catalog-modal-detail-item">
                          <span className="detail-label">Proctored</span>
                          <span className={`detail-value detail-badge ${cert.proctored ? 'badge-yes' : 'badge-no'}`}>
                            {cert.proctored ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {cert.questionType && (
                        <div className="catalog-modal-detail-item detail-wide">
                          <span className="detail-label">Question Type</span>
                          <span className="detail-value">{cert.questionType}</span>
                        </div>
                      )}
                    </div>

                    {cert.prerequisites && (
                      <div className="catalog-modal-detail-row">
                        <i className="ri-shield-check-line"></i>
                        <div>
                          <span className="detail-label">Prerequisites</span>
                          <span className="detail-value">{cert.prerequisites}</span>
                        </div>
                      </div>
                    )}
                    {cert.retakePolicy && (
                      <div className="catalog-modal-detail-row">
                        <i className="ri-refresh-line"></i>
                        <div>
                          <span className="detail-label">Retake Policy</span>
                          <span className="detail-value">{cert.retakePolicy}</span>
                        </div>
                      </div>
                    )}

                    {cert.examUrl && (
                      <a
                        href={cert.examUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="catalog-modal-exam-link"
                      >
                        View Official Exam Page <i className="ri-arrow-right-line"></i>
                      </a>
                    )}
                  </div>
                )}

                {selectedItem.links && selectedItem.links.length > 0 && (
                  <div className="catalog-modal-links">
                    {selectedItem.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="catalog-modal-link"
                      >
                        <i className="ri-external-link-line"></i> {link.label}
                      </a>
                    ))}
                  </div>
                )}

                {selectedItem.category === 'tech' && (
                  <ItemComments itemId={selectedItem.id} authUser={authUser ?? null} />
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
