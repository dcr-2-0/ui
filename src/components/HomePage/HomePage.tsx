import { useMemo } from 'react';
import { useCurrentQuarter, useQuarterConfig } from '../../contexts/QuarterContext';
import { tech } from '../../data/catalog/tech';
import { knowledge } from '../../data/catalog/knowledge';
import { collaboration } from '../../data/catalog/collaboration';
import { portalNews } from '../../data/portalNews';
import type { UserDocument, CatalogItem, PlanStatus } from '../../data/types';
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
  /** Deep-link: navigate to the item's catalog page and open its detail modal */
  onOpenCatalogItem?: (item: CatalogItem) => void;
}

// ── Module-level constants ────────────────────────────────────────────────────

const ALL_PROMOTED = [
  ...tech.filter((i) => i.promoted),
  ...knowledge.filter((i) => i.promoted),
  ...collaboration.filter((i) => i.promoted),
];

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

/** "Jul 1 — Sep 30" plus the quarter's total day count (for the progress ring) */
function getQuarterRange(quarter: string): { label: string; totalDays: number } {
  const parts = quarter.split('-');
  const q = parseInt(parts[0].slice(1));
  const year = parseInt(parts[1]);
  const start = new Date(year, (q - 1) * 3, 1);
  const end = new Date(year, q * 3, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return { label: `${fmt(start)} — ${fmt(end)}`, totalDays };
}

function getGreeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const first = name?.split(' ')[0] ?? 'there';
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage({
  user,
  profile,
  cartItems,
  onNavigate,
  onOpenCatalogItem,
}: HomePageProps) {
  const currentQuarter = useCurrentQuarter();
  const { isFrozen } = useQuarterConfig();

  // Filter news to items relevant to the current quarter (or quarter-agnostic)
  const activeNews = useMemo(
    () => portalNews.filter((n) => !n.quarter || n.quarter === currentQuarter),
    [currentQuarter]
  );
  const daysRemaining = getDaysRemainingInQuarter(currentQuarter);
  const quarterRange = getQuarterRange(currentQuarter);
  const currentLevel = profile?.currentLevel ?? null;

  // ── Cart breakdown ────────────────────────────────────────────────────────

  const cartItemIds = useMemo(() => new Set(cartItems.map((i) => i.id)), [cartItems]);

  // ── News card renderer (used by both columns of Program Updates) ──────────

  const renderNewsCard = (
    item: (typeof activeNews)[number],
    large = false,
  ) => {
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
        className={`home-news-card${large ? ' home-news-card--lg' : ''}`}
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
              {item.type === 'announcement' && 'New'}
            </span>
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
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const role = profile?.role ?? 'employee';
  const approvalStatus = profile?.approvalStatus;
  const displayName = profile?.displayName ?? user?.displayName;
  const photoURL = profile?.photoURL ?? user?.photoURL;

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
              {role === 'employee' && profile?.teamLeaderName && (
                <span className="home-tag home-tag-tl">
                  <i className="ri-user-star-line"></i> TL: {profile.teamLeaderName}
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
            <span className="home-hero-quarter-range">{quarterRange.label}</span>
          </div>
          <div className="home-hero-days-ring" aria-label={`${daysRemaining} days left in the quarter`}>
            <svg viewBox="0 0 72 72">
              <circle className="home-hero-ring-track" cx="36" cy="36" r="31" />
              <circle
                className="home-hero-ring-fill"
                cx="36"
                cy="36"
                r="31"
                strokeDasharray={2 * Math.PI * 31}
                strokeDashoffset={
                  2 * Math.PI * 31 *
                  (1 - Math.max(0, Math.min(1, daysRemaining / quarterRange.totalDays)))
                }
              />
            </svg>
            <div className="home-hero-days-ring-text">
              {isFrozen ? (
                <>
                  <i className="ri-lock-line home-hero-ring-lock"></i>
                  <span className="home-hero-ring-label">locked</span>
                </>
              ) : (
                <>
                  <span className="home-hero-ring-num">{daysRemaining}</span>
                  <span className="home-hero-ring-label">days left</span>
                </>
              )}
            </div>
          </div>
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
          </div>
          <div
            className={`home-news-layout${
              activeNews.length <= 2 ? ' home-news-layout--single' : ''
            }`}
          >
            {/* Two latest updates — featured column */}
            <div className="home-news-primary">
              {activeNews.slice(0, 2).map((item) => renderNewsCard(item, true))}
            </div>
            {/* Remaining updates — scrollable side column */}
            {activeNews.length > 2 && (
              <div className="home-news-side">
                <div className="home-news-side-scroll">
                  {activeNews.slice(2).map((item) => renderNewsCard(item))}
                </div>
              </div>
            )}
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
          </div>
          <p className="home-section-subtitle">
            These items carry bonus points this quarter — great choices for your plan.
          </p>
          <div className="home-featured-grid">
            {ALL_PROMOTED.map((item) => {
              const basePts = item.points;
              const bonusPts = item.promotedPoints ?? item.points;
              const bonusDelta = bonusPts - basePts;
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
                  onClick={() =>
                    onOpenCatalogItem
                      ? onOpenCatalogItem(item)
                      : onNavigate(navId, navLabel)
                  }
                >
                  <div className="home-featured-top">
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
                    <div className="home-featured-heading">
                      {item.subcategory && (
                        <span className="home-featured-provider">
                          {item.subcategory}
                        </span>
                      )}
                      <span className="home-featured-name">{item.name}</span>
                    </div>
                  </div>
                  <div className="home-featured-divider"></div>
                  <div className="home-featured-bottom">
                    <div className="home-featured-pts-block">
                      {bonusDelta > 0 && (
                        <div className="home-featured-bonus-line">
                          <span className="home-featured-bonus-value">
                            +{bonusDelta}
                          </span>
                          <span className="home-featured-bonus-label">
                            pts bonus
                          </span>
                        </div>
                      )}
                      <div className="home-featured-pts">
                        {bonusDelta > 0 && (
                          <>
                            <span className="home-featured-pts-base">
                              {basePts} pts
                            </span>
                            <i className="ri-arrow-right-line home-featured-pts-arrow"></i>
                          </>
                        )}
                        <span className="home-featured-pts-new">
                          {bonusPts} pts
                        </span>
                      </div>
                    </div>
                    <span className="home-featured-go">
                      <i className="ri-arrow-right-line"></i>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
