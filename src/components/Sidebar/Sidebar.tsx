import { useRef, useMemo, useState } from 'react';
import { navigation } from '../../data/navigation';
import type { NavItem } from '../../data/navigation';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import type { AuthUser } from '../../hooks/useAuth';
import type { UserRole, CatalogItem } from '../../data/types';
import { levels } from '../../data/levels';
import { professionalism } from '../../data/catalog/professionalism';
import './Sidebar.css';

const PILLAR_CFG = [
  { key: 'professionalism', name: 'Professionalism', icon: 'ri-shield-check-line', color: 'var(--success-color)' },
  { key: 'tech', name: 'Tech', icon: 'ri-computer-line', color: 'var(--accent-color)' },
  { key: 'knowledge-unlock', name: 'Knowledge Unlock', icon: 'ri-edit-line', color: '#8b5cf6' },
  { key: 'collaboration', name: 'Collaboration', icon: 'ri-hearts-line', color: '#ec4899' },
] as const;

type PillarKey = (typeof PILLAR_CFG)[number]['key'];

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string, label: string) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  cartTotalItems?: number;
  cartTotalPoints?: number;
  cartItems?: CatalogItem[];
  /** For the plan-insight popover */
  currentLevel?: number | null;
  carryOverPoints?: number;
  carriedItems?: CatalogItem[];
  user: AuthUser | null;
  isSimulatorMode?: boolean;
  onToggleMode?: () => void;
  userRole?: UserRole | null;
  pendingTeamCount?: number;
}

export default function Sidebar({
  activeId,
  onNavigate,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  cartTotalItems = 0,
  cartTotalPoints = 0,
  cartItems = [],
  currentLevel = null,
  carryOverPoints = 0,
  carriedItems = [],
  // SIMULATOR MODE DISABLED (user was only needed for the mode toggle):
  // user,
  // isSimulatorMode,
  // onToggleMode,
  userRole,
  pendingTeamCount = 0,
}: SidebarProps) {
  const navRef = useRef<HTMLElement>(null);
  const handleKeyDown = useKeyboardNav(navRef);

  // Deduplicate cart entries (repeatable items appear once with ×qty)
  const planPreview = useMemo(() => {
    const seen = new Map<string, { item: CatalogItem; qty: number }>();
    for (const it of cartItems) {
      const entry = seen.get(it.id);
      if (entry) entry.qty += 1;
      else seen.set(it.id, { item: it, qty: 1 });
    }
    return Array.from(seen.values());
  }, [cartItems]);

  // Plan insight — mirrors SimulatorPage's requirementsStatus rules:
  // roadmaps count as tech, carryover counts toward the total,
  // carried items count toward pillars and mandatory checks.
  const planInsight = useMemo(() => {
    const targetId = Math.min((currentLevel ?? 0) + 1, 10);
    const level = levels.find((l) => l.id === targetId) ?? levels[0];

    const byPillar: Record<PillarKey, { item: CatalogItem; qty: number }[]> = {
      professionalism: [],
      tech: [],
      'knowledge-unlock': [],
      collaboration: [],
    };
    for (const entry of planPreview) {
      const cat = (
        entry.item.category === 'roadmaps' ? 'tech' : entry.item.category
      ) as PillarKey;
      (byPillar[cat] ?? byPillar.tech).push(entry);
    }

    const entryPts = (arr: { item: CatalogItem; qty: number }[]) =>
      arr.reduce(
        (s, e) => s + (e.item.promotedPoints ?? e.item.points) * e.qty,
        0,
      );

    const carriedPillarPts: Partial<Record<PillarKey, number>> = {};
    for (const c of carriedItems) {
      const cat = (c.category === 'roadmaps' ? 'tech' : c.category) as PillarKey;
      carriedPillarPts[cat] =
        (carriedPillarPts[cat] ?? 0) + (c.promotedPoints ?? c.points);
    }

    const itemIds = new Set([
      ...cartItems.map((i) => i.id),
      ...carriedItems.map((i) => i.id),
    ]);
    const missingMandatoryNames = level.mandatoryItems
      .filter((id) => !itemIds.has(id))
      .map((id) => professionalism.find((p) => p.id === id)?.name ?? id);

    const pillars = PILLAR_CFG.map((cfg) => {
      const items = byPillar[cfg.key];
      if (cfg.key === 'professionalism') {
        const required = level.mandatoryItems.length;
        const have = required - missingMandatoryNames.length;
        return { ...cfg, items, have, required, unit: 'mandatory' as const, met: have >= required };
      }
      const pts = entryPts(items) + (carriedPillarPts[cfg.key] ?? 0);
      const required = level.pillarRequirements[cfg.key];
      return { ...cfg, items, have: pts, required, unit: 'pts' as const, met: pts >= required };
    });

    const effectivePoints = cartTotalPoints + carryOverPoints;
    const hasEnoughPoints = effectivePoints >= level.points;

    const shortfalls: string[] = [];
    if (!hasEnoughPoints) {
      shortfalls.push(
        `${(level.points - effectivePoints).toLocaleString()} more pts needed (${effectivePoints.toLocaleString()}/${level.points.toLocaleString()})`,
      );
    }
    for (const p of pillars) {
      if (p.unit === 'pts' && !p.met) {
        shortfalls.push(`${p.name}: ${p.required - p.have} pts short`);
      }
    }
    if (missingMandatoryNames.length > 0) {
      shortfalls.push(`Mandatory: ${missingMandatoryNames.join(', ')}`);
    }

    return { level, pillars, effectivePoints, hasEnoughPoints, shortfalls };
  }, [planPreview, cartItems, carriedItems, cartTotalPoints, carryOverPoints, currentLevel]);

  // Hover-intent for the popover: grace period lets the cursor cross the
  // gap between card and popover, and makes the popover itself interactive.
  const [planPopoverOpen, setPlanPopoverOpen] = useState(false);
  const popTimer = useRef<number | null>(null);
  const openPlanPopover = () => {
    if (popTimer.current) window.clearTimeout(popTimer.current);
    setPlanPopoverOpen(true);
  };
  const closePlanPopover = () => {
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setPlanPopoverOpen(false), 250);
  };

  const getItemLabel = (item: NavItem): string => {
    // SIMULATOR MODE DISABLED — was:
    // if (item.id === 'simulator' && !isSimulatorMode) return 'Plan';
    if (item.id === 'team-dashboard' && userRole === 'admin') return 'Admin Dashboard';
    return item.label;
  };

  const handleClick = (item: NavItem) => {
    onNavigate(item.id, getItemLabel(item));
    onClose();
  };

  const sidebarClasses = [
    'sidebar',
    isOpen && 'active',
    collapsed && 'collapsed',
  ]
    .filter(Boolean)
    .join(' ');

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((section) => {
    // Team section: only show to team_leader or admin
    if (section.title === 'Team') {
      return userRole === 'team_leader' || userRole === 'admin';
    }
    // Admin section: only show to admin (will be added later)
    if (section.title === 'Admin') {
      return userRole === 'admin';
    }
    // Show all other sections
    return true;
  });

  return (
    <aside className={sidebarClasses}>
      <div
        className="sidebar-plan-card"
        onClick={() => {
          onNavigate('simulator', 'Plan');
          onClose();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate('simulator', 'Plan');
            onClose();
          }
        }}
        onMouseEnter={openPlanPopover}
        onMouseLeave={closePlanPopover}
      >
        <div className="sidebar-plan-title">
          <i className="ri-calendar-todo-line"></i>
          Current Plan
          <i className="ri-arrow-right-s-line sidebar-plan-arrow"></i>
        </div>
        <div className="sidebar-plan-stats">
          <span className="sidebar-plan-points">
            {cartTotalPoints.toLocaleString()}
          </span>
          <span className="sidebar-plan-pts-label">pts</span>
        </div>
        <div className="sidebar-plan-items">
          {cartTotalItems === 0
            ? 'No items yet'
            : `${cartTotalItems} item${cartTotalItems !== 1 ? 's' : ''} in plan`}
        </div>

        {/* Plan insight popover (desktop only) */}
        <div
          className={`sidebar-plan-popover${planPopoverOpen ? ' open' : ''}`}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={openPlanPopover}
          onMouseLeave={closePlanPopover}
        >
          <div className="sidebar-plan-popover-title">
            Plan insight · toward Level {planInsight.level.id}
          </div>

          {/* Total */}
          <div className="spp-total">
            <span className="spp-total-label">Total</span>
            <span className="spp-total-value">
              {planInsight.effectivePoints.toLocaleString()} /{' '}
              {planInsight.level.points.toLocaleString()} pts
            </span>
            <i
              className={
                planInsight.hasEnoughPoints
                  ? 'ri-checkbox-circle-fill spp-ok'
                  : 'ri-close-circle-line spp-no'
              }
            ></i>
          </div>
          <div className="spp-bar">
            <div
              className="spp-bar-fill"
              style={{
                width: `${Math.min(
                  100,
                  (planInsight.effectivePoints / planInsight.level.points) * 100,
                )}%`,
              }}
            ></div>
          </div>
          {carryOverPoints > 0 && (
            <div className="spp-carry">
              includes {carryOverPoints.toLocaleString()} carryover pts
            </div>
          )}

          {/* Pillars with their items */}
          {planInsight.pillars.map((p) => (
            <div className="spp-pillar" key={p.key}>
              <div className="spp-pillar-head">
                <i className={p.icon} style={{ color: p.color }}></i>
                <span className="spp-pillar-name">{p.name}</span>
                <span className={`spp-pillar-req${p.met ? ' met' : ''}`}>
                  {p.have} / {p.required} {p.unit}
                </span>
                <i
                  className={
                    p.met ? 'ri-check-line spp-ok' : 'ri-close-line spp-no'
                  }
                ></i>
              </div>
              {p.items.length > 0 && (
                <ul className="spp-items">
                  {p.items.map(({ item, qty }) => (
                    <li key={item.id}>
                      <span className="spp-item-name">
                        {item.name}
                        {qty > 1 && <em> ×{qty}</em>}
                      </span>
                      <span className="spp-item-pts">
                        {(
                          (item.promotedPoints ?? item.points) * qty
                        ).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Missing for level-up */}
          <div className="spp-missing">
            <div className="spp-missing-title">Missing for level-up</div>
            {planInsight.shortfalls.length === 0 ? (
              <div className="spp-all-met">
                <i className="ri-checkbox-circle-fill"></i> All requirements met
              </div>
            ) : (
              <ul>
                {planInsight.shortfalls.map((s) => (
                  <li key={s}>
                    <i className="ri-close-circle-line"></i>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <nav
        className="sidebar-nav"
        ref={navRef}
        onKeyDown={handleKeyDown}
      >
        {/* SIMULATOR MODE DISABLED — restore this block (and the props passed
            from Layout.tsx) to bring back the Simulator/Real Plan toggle.
        {user && !collapsed && onToggleMode && (
          <div className="sidebar-mode-toggle">
            <button
              className={`sidebar-mode-option ${isSimulatorMode ? 'active' : ''}`}
              onClick={() => isSimulatorMode || onToggleMode()}
            >
              Simulator
            </button>
            <button
              className={`sidebar-mode-option ${!isSimulatorMode ? 'active' : ''}`}
              onClick={() => !isSimulatorMode || onToggleMode()}
            >
              Real Plan
            </button>
          </div>
        )}
        */}
        {filteredNavigation.map((section) => (
          <div
            className={`nav-section${
              section.title === 'Personal Zone' || section.title === 'Team'
                ? ' nav-section-mobile'
                : ''
            }`}
            key={section.title}
          >
            <h3 className="nav-section-title">{section.title}</h3>
            {section.items && (
              <ul className="nav-menu">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`nav-link${activeId === item.id ? ' active' : ''}`}
                      onClick={() => handleClick(item)}
                      title={collapsed ? getItemLabel(item) : undefined}
                    >
                      <span className="nav-icon"><i className={item.icon}></i></span>
                      <span className="nav-text">
                        {getItemLabel(item)}
                        {item.id === 'simulator' && cartTotalItems > 0 && (
                          <span className="nav-cart-badge">
                            {cartTotalItems} &bull; {cartTotalPoints}
                          </span>
                        )}
                        {item.id === 'team-dashboard' && pendingTeamCount > 0 && (
                          <span className="nav-cart-badge nav-pending-badge">
                            {pendingTeamCount}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {section.subsections?.map((sub) => (
              <div className="nav-subsection" key={sub.title}>
                <h4 className="nav-subsection-title">{sub.title}</h4>
                <ul className="nav-menu">
                  {sub.items.map((item) => (
                    <li key={item.id}>
                      <button
                        className={`nav-link${activeId === item.id ? ' active' : ''}`}
                        onClick={() => handleClick(item)}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="nav-icon"><i className={item.icon}></i></span>
                        <span className="nav-text">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </nav>
      <button
        className="collapse-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <i className={collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'}></i>
      </button>
    </aside>
  );
}
