import { useRef } from 'react';
import { navigation } from '../../data/navigation';
import type { NavItem } from '../../data/navigation';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import type { AuthUser } from '../../hooks/useAuth';
import type { UserRole } from '../../data/types';
import './Sidebar.css';

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string, label: string) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  cartTotalItems?: number;
  cartTotalPoints?: number;
  user: AuthUser | null;
  isSimulatorMode?: boolean;
  onToggleMode?: () => void;
  userRole?: UserRole | null;
  pendingTeamCount?: number;
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
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
  user,
  isSimulatorMode,
  onToggleMode,
  userRole,
  pendingTeamCount = 0,
  unreadNotifications = 0,
  onNotificationsClick,
}: SidebarProps) {
  const navRef = useRef<HTMLElement>(null);
  const handleKeyDown = useKeyboardNav(navRef);

  const getItemLabel = (item: NavItem): string => {
    if (item.id === 'simulator' && !isSimulatorMode) return 'Plan';
    if (item.id === 'team-dashboard' && userRole === 'admin') return 'All Teams';
    return item.label;
  };

  const handleClick = (item: NavItem) => {
    onNavigate(item.id, getItemLabel(item));
    onClose();
  };

  const handleLogoClick = () => {
    onNavigate('home', 'Welcome to DCR 2.0');
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
      <div className="sidebar-header">
        <h1 className="logo" onClick={handleLogoClick}>
          <span className="logo-icon">DCR</span>
          <span className="logo-text"> 2.0</span>
          <span className="cursor">|</span>
        </h1>
      </div>
      <nav
        className="sidebar-nav"
        ref={navRef}
        onKeyDown={handleKeyDown}
      >
        {filteredNavigation.map((section) => (
          <div className="nav-section" key={section.title}>
            <h3 className="nav-section-title">{section.title}</h3>
            {section.title === 'Personal Zone' && user && !collapsed && onToggleMode && (
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
      {user && onNotificationsClick && (
        <button
          className="sidebar-notifications-btn"
          onClick={onNotificationsClick}
          title="Notifications"
        >
          <i className="ri-notification-3-line"></i>
          {!collapsed && <span className="nav-text">Notifications</span>}
          {unreadNotifications > 0 && (
            <span className="nav-cart-badge nav-pending-badge">{unreadNotifications}</span>
          )}
        </button>
      )}
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
