import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CatalogItem, CertificationItem, RoadmapItem, RoadmapCert } from '../../data/types';
import type { AuthUser } from '../../hooks/useAuth';
import { SKILL_TAGS, PROVIDER_TAGS } from '../../data/catalog/tags';
import CatalogCard from './CatalogCard';
import GlassSelect from '../GlassSelect/GlassSelect';
import ItemComments from './ItemComments';
import './CatalogPage.css';

type SortOption = 'category' | 'points-desc' | 'points-asc';
type ViewMode = 'grid' | 'list';

/** Grid/list preference persists across sessions */
const VIEW_STORAGE_KEY = 'dcr-catalog-view';

/** Per-section UI state (search/filters) survives navigation within a session */
interface CachedPageState {
  search: string;
  tags: string[];
  hideAchieved: boolean;
}
const pageStateCache = new Map<string, CachedPageState>();

/** Sort is shared across all catalog sections (session-wide) */
let sharedSort: SortOption = 'category';

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
  /** Identifies the catalog section (tech, professionalism, …) for state caching */
  pageKey?: string;
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
  pageKey = 'catalog',
}: CatalogPageProps) {
  const cached = pageStateCache.get(pageKey);
  const [sort, setSort] = useState<SortOption>(sharedSort);
  const [view, setView] = useState<ViewMode>(() =>
    localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid',
  );
  const [search, setSearch] = useState(cached?.search ?? '');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(cached?.tags ?? []),
  );
  const [hideAchieved, setHideAchieved] = useState(cached?.hideAchieved ?? false);

  // Write-through: remember this section's state for the rest of the session
  useEffect(() => {
    pageStateCache.set(pageKey, {
      search,
      tags: Array.from(selectedTags),
      hideAchieved,
    });
  }, [pageKey, search, selectedTags, hideAchieved]);

  // Sort applies session-wide across all catalog sections
  useEffect(() => {
    sharedSort = sort;
  }, [sort]);

  // Grid/list is a lasting preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  // ── Sticky toolbar ─────────────────────────────────────
  // A 1px sentinel sits above the toolbar; when it scrolls out of the
  // content area the toolbar is pinned and switches to its condensed look
  // (background chrome + Filters button replacing the scrolled-away chips).
  const [stuck, setStuck] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const root = el.closest('.content-area');
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: root instanceof Element ? root : null, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Desktop: the panel only makes sense while pinned (the full chip rows are
  // visible again once unpinned). Small screens keep the button full-time,
  // so leave the panel alone there.
  useEffect(() => {
    if (!stuck && window.matchMedia('(min-width: 701px)').matches) {
      setFiltersOpen(false);
    }
  }, [stuck]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) setFiltersOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

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

  // Tag chip rows — rendered in the full block at rest, and inside the
  // condensed Filters panel when the toolbar is pinned / on small screens
  const renderTagFilters = () => (
    <>
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
    </>
  );

  return (
    <div className="catalog-page">
      <div ref={sentinelRef} className="catalog-toolbar-sentinel" aria-hidden="true"></div>
      {/* Bar chrome also applies while the filters panel is open (small screens can open it unpinned) */}
      <div ref={toolbarRef} className={`catalog-toolbar${stuck || filtersOpen ? ' is-stuck' : ''}`}>
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
          <span className="catalog-results-count">
            {sorted.length === items.length
              ? `${items.length} items`
              : `${sorted.length} of ${items.length}`}
          </span>
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
          {hasTags && (
            <button
              className={`catalog-filters-btn${filtersOpen ? ' open' : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <i className="ri-filter-3-line"></i>
              Filters
              {selectedTags.size > 0 && (
                <span className="catalog-filters-count">{selectedTags.size}</span>
              )}
            </button>
          )}
          <div className="catalog-sort-group">
            <span className="catalog-sort-label">Sort By:</span>
            <GlassSelect
              value={sort}
              onChange={(v) => setSort(v as SortOption)}
              options={[
                { value: 'category', label: 'Category Order' },
                { value: 'points-desc', label: 'Points: High to Low' },
                { value: 'points-asc', label: 'Points: Low to High' },
              ]}
            />
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

        {hasTags && filtersOpen && (
          <div className="catalog-filters-panel">{renderTagFilters()}</div>
        )}
      </div>

      {hasTags && <div className="catalog-tag-filters">{renderTagFilters()}</div>}

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
                className={`catalog-list-item${inCart || isLocked ? ' in-cart' : ''}${achieved ? ' achieved' : ''}`}
                key={item.id}
                onClick={() => setSelectedItem(item)}
              >
                {achieved ? (
                  <div className="catalog-list-achieved" title="Already achieved">
                    <i className="ri-checkbox-circle-fill"></i>
                  </div>
                ) : isLocked ? (
                  <button
                    className="catalog-list-add locked"
                    title={`Locked — your plan is ${isApprovedPlan ? 'approved' : 'awaiting approval'}. Manage it in My Plan.`}
                    disabled
                  >
                    <i className="ri-lock-line"></i>
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
                  {!achieved && (inCart || isLocked) && (
                    <span className="catalog-list-badge in-plan">In plan</span>
                  )}
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

        // Same 3-state logic as the cards: none / in plan / achieved,
        // with the plan's lock (submitted/approved) affecting only the action
        const modalAchieved = isAchieved?.(selectedItem.id) ?? false;
        const modalPlanStatus = getPlanItemStatus?.(selectedItem.id);
        const modalLocked = modalPlanStatus === 'pending' || modalPlanStatus === 'approved';
        const modalInCart = isInCart(selectedItem.id);
        const modalQty = getQuantity?.(selectedItem.id) ?? 0;

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
        // Portal to <body> so the backdrop covers the whole viewport
        return createPortal(
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
                    {(modalAchieved || modalInCart || modalLocked || selectedItem.required || selectedItem.promoted) && (
                      <div className="catalog-modal-badges">
                        {modalAchieved && (
                          <span className="catalog-card-badge badge-achieved">
                            <i className="ri-checkbox-circle-fill"></i> Done
                          </span>
                        )}
                        {!modalAchieved && (modalInCart || modalLocked) && (
                          <span className="catalog-card-badge badge-in-plan">
                            <i className="ri-time-line"></i> In plan
                          </span>
                        )}
                        {!modalAchieved && selectedItem.required && (
                          <span className="catalog-card-badge badge-required">Required</span>
                        )}
                        {!modalAchieved && selectedItem.promoted && !selectedItem.required && (
                          <span className="catalog-card-badge badge-promoted">Promoted</span>
                        )}
                      </div>
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
                            {cert.price === 0
                              ? 'Free'
                              : `$${Number.isInteger(cert.price) ? cert.price : cert.price.toFixed(2)} USD`}
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

              {/* Sticky action footer — mirrors the card action logic */}
              <div className="catalog-modal-footer">
                {modalAchieved ? (
                  <div className="catalog-modal-state-chip achieved">
                    <i className="ri-checkbox-circle-fill"></i> Already achieved
                  </div>
                ) : modalLocked ? (
                  <div className="catalog-modal-state-chip locked">
                    <i className="ri-lock-line"></i>
                    In plan — locked while your plan is{' '}
                    {modalPlanStatus === 'approved' ? 'approved' : 'awaiting approval'}
                  </div>
                ) : selectedItem.repeatable && onAddItem && onRemoveItem && modalQty > 0 ? (
                  <div className="catalog-modal-qty-row">
                    <span className="catalog-modal-qty-label">
                      In plan ×{modalQty}
                    </span>
                    <div className="catalog-qty-controls">
                      <button
                        className="catalog-qty-btn"
                        onClick={() => onRemoveItem(selectedItem.id)}
                        title="Remove one"
                      >
                        <i className="ri-subtract-line"></i>
                      </button>
                      <span className="catalog-qty-count">{modalQty}</span>
                      <button
                        className="catalog-qty-btn"
                        onClick={() => onAddItem(selectedItem)}
                        title="Add one more"
                      >
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                  </div>
                ) : modalInCart ? (
                  <button
                    className="catalog-modal-action added"
                    onClick={() => handleListToggle(selectedItem)}
                  >
                    <span className="cma-default">
                      <i className="ri-check-line"></i> In Plan
                    </span>
                    <span className="cma-hover">
                      <i className="ri-close-line"></i> Remove from Plan
                    </span>
                  </button>
                ) : (
                  <button
                    className="catalog-modal-action add"
                    onClick={() => handleListToggle(selectedItem)}
                  >
                    <i className="ri-add-line"></i> Add to Plan
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}
