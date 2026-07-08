import { useMemo } from 'react';
import { useAchievements } from '../../hooks/useAchievements';
import { useCurrentQuarter, useQuarterConfig } from '../../contexts/QuarterContext';
import { professionalism } from '../../data/catalog/professionalism';
import { tech } from '../../data/catalog/tech';
import { knowledge } from '../../data/catalog/knowledge';
import { collaboration } from '../../data/catalog/collaboration';
import { levels, MANDATORY_ITEM_IDS } from '../../data/levels';
import { portalNews } from '../../data/portalNews';
import type { UserDocument, CatalogItem, PlanStatus, Achievement } from '../../data/types';
import './HomePage.css';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface HomePageProps {
  user: AuthUser | null;
  profile: UserDocument | null;
  cartItems: CatalogItem[];
  cartTotalPoints: number;
  planStatus?: PlanStatus;
  isSimulatorMode: boolean;
  useRealPlan: boolean;
  carryOverPoints: number;
  onNavigate: (id: string, label: string) => void;
}

// ── Module-level constants ────────────────────────────────────────────────────

const ALL_PROMOTED = [
  ...tech.filter((i) => i.promoted),
  ...knowledge.filter((i) => i.promoted),
  ...collaboration.filter((i) => i.promoted),
];

const PILLAR_REQS = { tech: 50, 'knowledge-unlock': 20, collaboration: 30 } as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getDaysRemainingInQuarter(quarter: string): number {
  const parts = quarter.split('-');
  const q = parseInt(parts[0].slice(1));
  const year = parseInt(parts[1]);
  const end = new Date(year, q * 3, 0); // last day of quarter
  return Math.max(0, Math.ceil((end.getTime() - new Date().getTime()) / 86400000));
}

function getGreeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const first = name?.split(' ')[0] ?? 'there';
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const PILLAR_CFG: Record<string, { icon: string; color: string }> = {
  tech: { icon: 'ri-computer-line', color: 'var(--accent-color)' },
  professionalism: { icon: 'ri-shield-check-line', color: 'var(--success-color)' },
  'knowledge-unlock': { icon: 'ri-edit-line', color: '#8b5cf6' },
  collaboration: { icon: 'ri-hearts-line', color: '#ec4899' },
  roadmaps: { icon: 'ri-route-line', color: 'var(--warning-color)' },
};

export default function HomePage({
  user,
  profile,
  cartItems,
  cartTotalPoints,
  planStatus,
  isSimulatorMode,
  useRealPlan,
  onNavigate,
}: HomePageProps) {
  const { achievements, isLoading: achLoading } = useAchievements(user?.email ?? null);
  const currentQuarter = useCurrentQuarter();
  const { isFrozen } = useQuarterConfig();

  // Filter news to items relevant to the current quarter (or quarter-agnostic)
  const activeNews = useMemo(
    () => portalNews.filter((n) => !n.quarter || n.quarter === currentQuarter),
    [currentQuarter]
  );
  const daysRemaining = getDaysRemainingInQuarter(currentQuarter);
  const currentLevel = profile?.currentLevel ?? null;
  const nextLevelDef = currentLevel != null ? levels.find((l) => l.id === currentLevel + 1) : levels[0];

  // ── Cart breakdown ────────────────────────────────────────────────────────

  const cartItemIds = useMemo(() => new Set(cartItems.map((i) => i.id)), [cartItems]);

  const cartPointsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      const pts = item.promotedPoints ?? item.points;
      map[item.category] = (map[item.category] ?? 0) + pts;
    }
    return map;
  }, [cartItems]);

  const cartByCategory = useMemo(() => {
    const map: Record<string, CatalogItem[]> = {};
    for (const item of cartItems) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [cartItems]);

  const requiredInCart = useMemo(
    () => MANDATORY_ITEM_IDS.filter((id) => cartItemIds.has(id)),
    [cartItemIds]
  );

  // ── Points / level bank ───────────────────────────────────────────────────

  const totalApprovedPoints = useMemo(() => {
    const histPts = (profile?.achieved?.items ?? [])
      .filter((a) => a.status === 'approved')
      .reduce((s, a) => s + (a.item.promotedPoints ?? a.item.points), 0);
    const qPts = achievements
      .filter((a: Achievement) => a.status === 'approved')
      .reduce((s: number, a: Achievement) => s + (a.item.promotedPoints ?? a.item.points), 0);
    return histPts + qPts + (profile?.preSystemPoints ?? 0);
  }, [profile?.achieved?.items, profile?.preSystemPoints, achievements]);

  const consumedPoints = useMemo(() => {
    if (currentLevel == null) return 0;
    return levels.filter((l) => l.id <= currentLevel).reduce((s, l) => s + l.points, 0);
  }, [currentLevel]);

  const bankedPoints = Math.max(0, totalApprovedPoints - consumedPoints);
  const progressToNext = nextLevelDef
    ? Math.min(100, Math.round((bankedPoints / nextLevelDef.points) * 100))
    : currentLevel === 10
    ? 100
    : 0;

  // ── Recent achievements ───────────────────────────────────────────────────

  const recentAchievements = useMemo(() => {
    const hist = (profile?.achieved?.items ?? []).map((a, i) => ({
      key: `h-${a.itemId}-${i}`,
      item: a.item,
      status: a.status as string,
      date: a.completionDate,
      quarter: null as string | null,
    }));
    const qAch = achievements.map((a: Achievement) => ({
      key: a.id,
      item: a.item,
      status: a.status as string,
      date: a.completionDate,
      quarter: a.quarter ?? null,
    }));
    return [...qAch, ...hist]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [profile?.achieved?.items, achievements]);

  // ── Pillar points ─────────────────────────────────────────────────────────

  const techPts = cartPointsByCategory['tech'] ?? 0;
  const knowledgePts = cartPointsByCategory['knowledge-unlock'] ?? 0;
  const collabPts = cartPointsByCategory['collaboration'] ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  const role = profile?.role ?? 'employee';
  const approvalStatus = profile?.approvalStatus;
  const displayName = profile?.displayName ?? user?.displayName;
  const photoURL = profile?.photoURL ?? user?.photoURL;

  const planStatusColor =
    planStatus === 'approved'
      ? 'var(--success-color)'
      : planStatus === 'rejected'
      ? 'var(--error-color)'
      : planStatus === 'pending'
      ? 'var(--warning-color)'
      : 'var(--text-muted)';

  const planStatusIcon =
    planStatus === 'approved'
      ? 'ri-checkbox-circle-line'
      : planStatus === 'rejected'
      ? 'ri-close-circle-line'
      : planStatus === 'pending'
      ? 'ri-time-line'
      : 'ri-file-edit-line';

  const planStatusLabel = useRealPlan
    ? planStatus === 'approved'
      ? 'Approved'
      : planStatus === 'rejected'
      ? 'Rejected'
      : planStatus === 'pending'
      ? 'Under Review'
      : 'Draft'
    : 'Simulator';

  return (
    <div className="home-page">

      {/* ── Hero ── */}
      <div className="home-hero">
        <div className="home-hero-left">
          <div className={`home-hero-avatar home-avatar-${role}`}>
            {photoURL ? (
              <img src={photoURL} alt={displayName ?? ''} />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>
          <div className="home-hero-identity">
            <p className="home-hero-greeting">
              {user ? getGreeting(displayName) : 'Welcome to DCR 2.0'}
            </p>
            <h1 className="home-hero-name">
              {displayName ?? 'Development Career Roadmap'}
            </h1>
            <div className="home-hero-tags">
              {currentLevel != null && (
                <span className="home-tag home-tag-level">
                  <i className="ri-bar-chart-2-line"></i> Level {currentLevel}
                </span>
              )}
              {role === 'team_leader' && (
                <span className="home-tag home-tag-tl">
                  <i className="ri-user-star-line"></i> Team Leader
                </span>
              )}
              {role === 'admin' && (
                <span className="home-tag home-tag-admin">
                  <i className="ri-shield-star-line"></i> Admin
                </span>
              )}
              {approvalStatus === 'approved' && (
                <span className="home-tag home-tag-approved">
                  <i className="ri-checkbox-circle-line"></i> Active
                </span>
              )}
              {approvalStatus === 'pending' && (
                <span className="home-tag home-tag-pending">
                  <i className="ri-time-line"></i> Pending Approval
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="home-hero-right">
          <div className="home-hero-quarter-box">
            <span className="home-hero-quarter-label">Current Quarter</span>
            <span className="home-hero-quarter-value">{currentQuarter}</span>
            {isFrozen ? (
              <span className="home-hero-days-left">
                <i className="ri-lock-line"></i> Quarter locked
              </span>
            ) : (
              <span className="home-hero-days-left">
                <i className="ri-time-line"></i> {daysRemaining}d remaining
              </span>
            )}
          </div>
          <span className={`home-mode-badge ${isSimulatorMode ? 'sim' : 'real'}`}>
            <i className={isSimulatorMode ? 'ri-flask-line' : 'ri-record-circle-line'}></i>
            {isSimulatorMode ? 'Simulator' : 'Real Plan'}
          </span>
        </div>
      </div>

      {/* ── Top Stats Row ── */}
      <div className="home-stats-row">
        {/* Plan points */}
        <div className="home-stat-card" onClick={() => onNavigate('simulator', 'Plan')}>
          <div className="home-stat-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <i className="ri-shopping-cart-2-line" style={{ color: 'var(--accent-color)' }}></i>
          </div>
          <div className="home-stat-body">
            <span className="home-stat-value">{cartTotalPoints.toLocaleString()}</span>
            <span className="home-stat-label">Points in plan</span>
            <span className="home-stat-sub">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} added
            </span>
          </div>
          <i className="home-stat-chevron ri-arrow-right-s-line"></i>
        </div>

        {/* Level progress */}
        <div className="home-stat-card" onClick={() => onNavigate('my-profile', 'My Profile')}>
          <div className="home-stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <i className="ri-bar-chart-2-line" style={{ color: 'var(--success-color)' }}></i>
          </div>
          <div className="home-stat-body">
            <span className="home-stat-value">
              {currentLevel != null ? `Level ${currentLevel}` : '—'}
            </span>
            <span className="home-stat-label">Current level</span>
            <span className="home-stat-sub">
              {nextLevelDef
                ? `${bankedPoints.toLocaleString()} / ${nextLevelDef.points.toLocaleString()} pts → L${nextLevelDef.id}`
                : currentLevel === 10
                ? 'Maximum level reached!'
                : user
                ? 'Set up profile to track'
                : 'Sign in to track'}
            </span>
          </div>
          {nextLevelDef && (
            <div className="home-stat-progress-bar">
              <div
                className="home-stat-progress-fill"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          )}
          <i className="home-stat-chevron ri-arrow-right-s-line"></i>
        </div>

        {/* Plan status */}
        <div className="home-stat-card" onClick={() => onNavigate('simulator', 'Plan')}>
          <div
            className="home-stat-icon-wrap"
            style={{
              background: planStatus
                ? `${planStatusColor}1a`
                : 'rgba(100,116,139,0.12)',
            }}
          >
            <i className={planStatusIcon} style={{ color: planStatusColor }}></i>
          </div>
          <div className="home-stat-body">
            <span className="home-stat-value" style={{ color: planStatus ? planStatusColor : undefined }}>
              {planStatusLabel}
            </span>
            <span className="home-stat-label">Plan status</span>
            <span className="home-stat-sub">
              {useRealPlan ? currentQuarter : 'Switch to Real Plan to submit'}
            </span>
          </div>
          <i className="home-stat-chevron ri-arrow-right-s-line"></i>
        </div>
      </div>

      {/* ── Program Updates / News ── */}
      {activeNews.length > 0 && (
        <div className="home-section">
          <div className="home-section-header-row">
            <h2 className="home-section-title">
              <i className="ri-megaphone-line"></i>
              Program Updates
            </h2>
            <button
              className="home-card-link-btn"
              onClick={() => onNavigate('guidelines', 'Guidelines')}
            >
              Full guidelines <i className="ri-arrow-right-line"></i>
            </button>
          </div>
          <div className="home-news-scroll">
            {activeNews.map((item) => {
              const COLOR: Record<string, string> = {
                promotion: 'var(--warning-color)',
                deadline: 'var(--error-color)',
                reminder: 'var(--accent-color)',
                announcement: '#8b5cf6',
              };
              const BG: Record<string, string> = {
                promotion: 'rgba(245,158,11,0.08)',
                deadline: 'rgba(239,68,68,0.06)',
                reminder: 'rgba(59,130,246,0.06)',
                announcement: 'rgba(139,92,246,0.06)',
              };
              const BORDER: Record<string, string> = {
                promotion: 'rgba(245,158,11,0.18)',
                deadline: 'rgba(239,68,68,0.15)',
                reminder: 'rgba(59,130,246,0.13)',
                announcement: 'rgba(139,92,246,0.15)',
              };
              const color = COLOR[item.type];
              return (
                <div
                  key={item.id}
                  className="home-news-card"
                  style={{
                    background: BG[item.type],
                    borderColor: BORDER[item.type],
                  }}
                >
                  <div className="home-news-card-top">
                    <div
                      className="home-news-icon"
                      style={{ background: `${color}18`, color }}
                    >
                      <i className={item.icon}></i>
                    </div>
                    <div className="home-news-badges">
                      <span
                        className="home-news-type-badge"
                        style={{ background: `${color}14`, color, borderColor: `${color}25` }}
                      >
                        {item.type === 'promotion' && 'Promotion'}
                        {item.type === 'deadline' && 'Deadline'}
                        {item.type === 'reminder' && 'Reminder'}
                        {item.type === 'announcement' && "What's New"}
                      </span>
                      {item.isNew && (
                        <span className="home-news-new-badge">NEW</span>
                      )}
                    </div>
                  </div>
                  <h3 className="home-news-title">{item.title}</h3>
                  <p className="home-news-body">{item.body}</p>
                  {item.link && (
                    <button
                      className="home-news-link"
                      style={{ color }}
                      onClick={() => onNavigate(item.link!.navId, item.link!.navLabel)}
                    >
                      {item.link.label} <i className="ri-arrow-right-line"></i>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pillars Section ── */}
      {user && (
        <div className="home-section">
          <h2 className="home-section-title">
            <i className="ri-layout-4-line"></i>
            Pillars This Quarter
          </h2>
          <div className="home-pillars-grid">

            {/* Professionalism */}
            <div
              className="home-pillar-card"
              onClick={() => onNavigate('professionalism', 'Professionalism')}
            >
              <div className="home-pillar-top">
                <div className="home-pillar-icon" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success-color)' }}>
                  <i className="ri-shield-check-line"></i>
                </div>
                <div className="home-pillar-meta">
                  <span className="home-pillar-name">Professionalism</span>
                  <span className="home-pillar-sub">Required items</span>
                </div>
                <span
                  className={`home-pillar-badge ${
                    requiredInCart.length === MANDATORY_ITEM_IDS.length
                      ? 'done'
                      : requiredInCart.length > 0
                      ? 'partial'
                      : 'missing'
                  }`}
                >
                  {requiredInCart.length}/{MANDATORY_ITEM_IDS.length}
                </span>
              </div>
              <div className="home-pillar-checklist">
                {professionalism
                  .filter((i) => MANDATORY_ITEM_IDS.includes(i.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`home-pillar-check-row ${cartItemIds.has(item.id) ? 'checked' : ''}`}
                    >
                      <i
                        className={
                          cartItemIds.has(item.id)
                            ? 'ri-checkbox-circle-fill'
                            : 'ri-checkbox-blank-circle-line'
                        }
                      ></i>
                      <span>{item.name}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Tech */}
            <div
              className="home-pillar-card"
              onClick={() => onNavigate('tech', 'Tech')}
            >
              <div className="home-pillar-top">
                <div className="home-pillar-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent-color)' }}>
                  <i className="ri-computer-line"></i>
                </div>
                <div className="home-pillar-meta">
                  <span className="home-pillar-name">Tech</span>
                  <span className="home-pillar-sub">Min. {PILLAR_REQS.tech} pts</span>
                </div>
                <span
                  className={`home-pillar-badge ${
                    techPts >= PILLAR_REQS.tech ? 'done' : techPts > 0 ? 'partial' : 'missing'
                  }`}
                >
                  {techPts} pts
                </span>
              </div>
              <div className="home-pillar-bar-row">
                <div className="home-pillar-bar">
                  <div
                    className={`home-pillar-bar-fill ${techPts >= PILLAR_REQS.tech ? 'done' : 'tech'}`}
                    style={{ width: `${Math.min(100, (techPts / PILLAR_REQS.tech) * 100)}%` }}
                  />
                </div>
                <span className="home-pillar-bar-label">
                  {techPts >= PILLAR_REQS.tech
                    ? `Min. met ✓`
                    : `${PILLAR_REQS.tech - techPts} more pts needed`}
                </span>
              </div>
              {(cartByCategory['tech']?.length ?? 0) > 0 && (
                <div className="home-pillar-chips">
                  {(cartByCategory['tech'] ?? []).slice(0, 3).map((item) => (
                    <span key={item.id} className="home-pillar-chip">
                      {item.image && <img src={item.image} alt="" />}
                      {item.name.replace(/^(AWS|GCP|HashiCorp|Kubernetes)\s+Certified\s*/i, '').slice(0, 24)}
                    </span>
                  ))}
                  {(cartByCategory['tech']?.length ?? 0) > 3 && (
                    <span className="home-pillar-chip home-pillar-chip-more">
                      +{(cartByCategory['tech']?.length ?? 0) - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Knowledge Unlock */}
            <div
              className="home-pillar-card"
              onClick={() => onNavigate('knowledge-unlock', 'Knowledge Unlock')}
            >
              <div className="home-pillar-top">
                <div className="home-pillar-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <i className="ri-edit-line"></i>
                </div>
                <div className="home-pillar-meta">
                  <span className="home-pillar-name">Knowledge Unlock</span>
                  <span className="home-pillar-sub">Min. {PILLAR_REQS['knowledge-unlock']} pts</span>
                </div>
                <span
                  className={`home-pillar-badge ${
                    knowledgePts >= PILLAR_REQS['knowledge-unlock']
                      ? 'done'
                      : knowledgePts > 0
                      ? 'partial'
                      : 'missing'
                  }`}
                >
                  {knowledgePts} pts
                </span>
              </div>
              <div className="home-pillar-bar-row">
                <div className="home-pillar-bar">
                  <div
                    className={`home-pillar-bar-fill ${knowledgePts >= PILLAR_REQS['knowledge-unlock'] ? 'done' : 'knowledge'}`}
                    style={{
                      width: `${Math.min(100, (knowledgePts / PILLAR_REQS['knowledge-unlock']) * 100)}%`,
                    }}
                  />
                </div>
                <span className="home-pillar-bar-label">
                  {knowledgePts >= PILLAR_REQS['knowledge-unlock']
                    ? 'Min. met ✓'
                    : `${PILLAR_REQS['knowledge-unlock'] - knowledgePts} more pts needed`}
                </span>
              </div>
            </div>

            {/* Collaboration */}
            <div
              className="home-pillar-card"
              onClick={() => onNavigate('collaboration', 'Collaboration')}
            >
              <div className="home-pillar-top">
                <div className="home-pillar-icon" style={{ background: 'rgba(236,72,153,0.12)', color: '#ec4899' }}>
                  <i className="ri-hearts-line"></i>
                </div>
                <div className="home-pillar-meta">
                  <span className="home-pillar-name">Collaboration</span>
                  <span className="home-pillar-sub">Min. {PILLAR_REQS.collaboration} pts</span>
                </div>
                <span
                  className={`home-pillar-badge ${
                    collabPts >= PILLAR_REQS.collaboration
                      ? 'done'
                      : collabPts > 0
                      ? 'partial'
                      : 'missing'
                  }`}
                >
                  {collabPts} pts
                </span>
              </div>
              <div className="home-pillar-bar-row">
                <div className="home-pillar-bar">
                  <div
                    className={`home-pillar-bar-fill ${collabPts >= PILLAR_REQS.collaboration ? 'done' : 'collab'}`}
                    style={{
                      width: `${Math.min(100, (collabPts / PILLAR_REQS.collaboration) * 100)}%`,
                    }}
                  />
                </div>
                <span className="home-pillar-bar-label">
                  {collabPts >= PILLAR_REQS.collaboration
                    ? 'Min. met ✓'
                    : `${PILLAR_REQS.collaboration - collabPts} more pts needed`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Featured This Quarter ── */}
      {ALL_PROMOTED.length > 0 && (
        <div className="home-section">
          <div className="home-section-header-row">
            <h2 className="home-section-title">
              <i className="ri-sparkling-2-line"></i>
              Featured This Quarter
            </h2>
            <span className="home-section-badge-pill">
              <i className="ri-gift-line"></i> Bonus Points
            </span>
          </div>
          <p className="home-section-subtitle">
            These items carry bonus points this quarter — great choices for your plan.
          </p>
          <div className="home-featured-scroll">
            {ALL_PROMOTED.map((item) => {
              const basePts = item.points;
              const bonusPts = item.promotedPoints ?? item.points;
              const inCart = cartItemIds.has(item.id);
              const navId =
                item.category === 'knowledge-unlock'
                  ? 'knowledge-unlock'
                  : item.category === 'collaboration'
                  ? 'collaboration'
                  : 'tech';
              const navLabel =
                item.category === 'knowledge-unlock'
                  ? 'Knowledge Unlock'
                  : item.category === 'collaboration'
                  ? 'Collaboration'
                  : 'Tech';
              return (
                <div
                  key={item.id}
                  className={`home-featured-card ${inCart ? 'in-cart' : ''}`}
                  onClick={() => onNavigate(navId, navLabel)}
                >
                  <div className="home-featured-img-wrap">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <i className="ri-award-line"></i>
                    )}
                    {inCart && (
                      <div className="home-featured-in-cart-badge">
                        <i className="ri-check-line"></i>
                      </div>
                    )}
                  </div>
                  <div className="home-featured-body">
                    <span className="home-featured-name">{item.name}</span>
                    {item.subcategory && (
                      <span className="home-featured-sub">{item.subcategory}</span>
                    )}
                    <div className="home-featured-pts">
                      {bonusPts !== basePts && (
                        <span className="home-featured-pts-base">{basePts} pts</span>
                      )}
                      <span className="home-featured-pts-bonus">{bonusPts} pts</span>
                    </div>
                  </div>
                  <i className="home-featured-arrow ri-arrow-right-line"></i>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom Grid: Recent Activity ── */}
      <div className="home-bottom-grid">

        {/* Recent Achievements */}
        <div className="home-card">
          <div className="home-card-header-row">
            <h2 className="home-section-title">
              <i className="ri-trophy-line"></i>
              Recent Achievements
            </h2>
            {user && (
              <button
                className="home-card-link-btn"
                onClick={() => onNavigate('my-profile', 'My Profile')}
              >
                View all <i className="ri-arrow-right-line"></i>
              </button>
            )}
          </div>
          {!user ? (
            <div className="home-empty-state">
              <i className="ri-user-line"></i>
              <p>Sign in to see your achievements.</p>
            </div>
          ) : achLoading ? (
            <div className="home-empty-state">
              <p>Loading...</p>
            </div>
          ) : recentAchievements.length === 0 ? (
            <div className="home-empty-state">
              <i className="ri-inbox-line"></i>
              <p>No achievements yet — complete items to earn them!</p>
            </div>
          ) : (
            <div className="home-ach-list">
              {recentAchievements.map(({ key, item, status, date, quarter }) => {
                const pts = item.promotedPoints ?? item.points;
                const pillar = PILLAR_CFG[item.category];
                const statusColor =
                  status === 'approved'
                    ? 'var(--success-color)'
                    : status === 'rejected'
                    ? 'var(--error-color)'
                    : status === 'submitted'
                    ? 'var(--warning-color)'
                    : 'var(--text-muted)';
                return (
                  <div key={key} className="home-ach-row">
                    <div
                      className="home-ach-icon"
                      style={{ background: `${pillar?.color ?? 'var(--accent-color)'}18` }}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <i
                          className={pillar?.icon ?? 'ri-star-line'}
                          style={{ color: pillar?.color }}
                        />
                      )}
                    </div>
                    <div className="home-ach-info">
                      <span className="home-ach-name">{item.name}</span>
                      <div className="home-ach-meta">
                        {quarter && <span className="home-ach-quarter">{quarter}</span>}
                        <span className="home-ach-date">{fmtDate(date)}</span>
                      </div>
                    </div>
                    <div className="home-ach-right">
                      {pts > 0 && <span className="home-ach-pts">+{pts}</span>}
                      <span className="home-ach-status" style={{ color: statusColor }}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Guest CTA ── */}
      {!user && (
        <div className="home-guest-cta">
          <div className="home-guest-cta-content">
            <i className="ri-rocket-2-line"></i>
            <div>
              <h3>Ready to accelerate your career?</h3>
              <p>
                Sign in with your Develeap account to track your quarterly progress, build a
                real plan, and earn certifications.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
