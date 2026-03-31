import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../Sidebar/Sidebar";
import CommandPalette from "../CommandPalette/CommandPalette";
import type { SearchItem } from "../CommandPalette/CommandPalette";
import Toast, { type ToastMessage } from "../Toast/Toast";
import FormsPage from "../FormsPage/FormsPage";
import GuidelinesPage from "../GuidelinesPage/GuidelinesPage";
import FaqPage from "../FaqPage/FaqPage";
import CatalogPage from "../CatalogPage/CatalogPage";
import ExtraPage from "../ExtraPage/ExtraPage";
import SimulatorPage from "../SimulatorPage/SimulatorPage";
import { TeamLeaderDashboard } from "../TeamLeaderDashboard/TeamLeaderDashboard";
import ProfilePage from "../ProfilePage/ProfilePage";
import {
  ProfileSetupModal,
  type ProfileSetupData,
} from "../ProfileSetupModal/ProfileSetupModal";
import { PendingApprovalPage } from "../PendingApprovalPage/PendingApprovalPage";
import HomePage from "../HomePage/HomePage";
import { getAllNavItems } from "../../data/navigation";
import { professionalism } from "../../data/catalog/professionalism";
import { tech } from "../../data/catalog/tech";
import { knowledge } from "../../data/catalog/knowledge";
import { collaboration } from "../../data/catalog/collaboration";
import { roadmaps } from "../../data/catalog/roadmaps";
import { useTheme } from "../../hooks/useTheme";
import { useSimulatorCart } from "../../hooks/useSimulatorCart";
import { useUserPlan } from "../../hooks/useUserPlan";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useAppConfig } from "../../hooks/useAppConfig";
import { computeCurrentCalendarQuarter } from "../../utils/quarterUtils";
import { QuarterProvider } from "../../contexts/QuarterContext";
import { useTeamMembers } from "../../hooks/useTeamMembers";
import { useLevelUpRequests } from "../../hooks/useLevelUpRequests";
import { usePlanHistory } from "../../hooks/usePlanHistory";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../hooks/useAuth";
import type { AuthUser } from "../../hooks/useAuth";
import type { CatalogItem, RoadmapItem, UserDocument } from "../../data/types";
import { levels } from "../../data/levels";
import "./Layout.css";

function HeaderUser({
  user,
  userProfile,
  teamLeaderName,
  onSignIn,
  onSignOut,
}: {
  user: AuthUser | null;
  userProfile: UserDocument | null;
  teamLeaderName: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgError(false);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (!user) {
    return (
      <button className="header-sign-in-btn" onClick={onSignIn}>
        <i className="ri-google-fill"></i>
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <div className="header-user" ref={ref}>
      <button
        className="header-avatar-btn"
        onClick={() => setOpen((o) => !o)}
        title={user.email}
      >
        {user.photoURL && !imgError ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="header-avatar-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="header-avatar-placeholder">
            {getInitials(user.displayName)}
          </div>
        )}
      </button>
      {open && (
        <div className="header-user-dropdown">
          <div className="header-user-name">{user.displayName}</div>
          <div className="header-user-email">{user.email}</div>
          {userProfile?.role === "team_leader" && (
            <div className="header-user-role">
              <i className="ri-user-star-line"></i> Team Leader
            </div>
          )}
          {userProfile?.role === "employee" &&
            userProfile?.approvalStatus === "approved" &&
            teamLeaderName && (
              <div className="header-user-role">
                <i className="ri-user-star-line"></i> Reports to{" "}
                <strong>{teamLeaderName}</strong>
              </div>
            )}
          {userProfile?.role === "employee" &&
            userProfile?.approvalStatus === "pending" && (
              <div className="header-user-role header-user-role--pending">
                <i className="ri-time-line"></i> Awaiting approval
              </div>
            )}
          {userProfile?.role === "employee" &&
            userProfile?.approvalStatus === "rejected" && (
              <div className="header-user-role header-user-role--rejected">
                <i className="ri-close-circle-line"></i> Approval rejected
              </div>
            )}
          <button
            className="header-user-signout"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <i className="ri-logout-box-line"></i> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function isRoadmapComplete(
  roadmap: RoadmapItem,
  satisfiedIds: Set<string>,
): boolean {
  if (!roadmap.requiredCerts?.length) return false;
  const seenGroups = new Set<string>();
  for (const cert of roadmap.requiredCerts) {
    if (cert.choiceGroup) {
      if (seenGroups.has(cert.choiceGroup)) continue;
      seenGroups.add(cert.choiceGroup);
      const groupSatisfied = roadmap.requiredCerts
        .filter((c) => c.choiceGroup === cert.choiceGroup)
        .some((c) => satisfiedIds.has(c.id));
      if (!groupSatisfied) return false;
    } else {
      if (!satisfiedIds.has(cert.id)) return false;
    }
  }
  return true;
}

export default function Layout() {
  const [activeId, setActiveId] = useState("home");
  const [activeLabel, setActiveLabel] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("dcr-sidebar-collapsed") === "true";
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [focusItemId, setFocusItemId] = useState<number | null>(null);
  const [focusCatalogItemId, setFocusCatalogItemId] = useState<string | null>(
    null,
  );
  const [certBackNav, setCertBackNav] = useState<{
    id: string;
    label: string;
    openItemId?: string;
  } | null>(null);
  const [simulatorBackNav, setSimulatorBackNav] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialRoadmapCheckDone = useRef(false);
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const userProfile = useUserProfile(auth.user);
  const simulatorCart = useSimulatorCart();
  const { activeQuarter, setActiveQuarter } = useAppConfig();
  const currentQuarter = activeQuarter ?? computeCurrentCalendarQuarter();
  const userPlan = useUserPlan(auth.user, currentQuarter);

  // Fetch team members for team leaders and admins (to show pending count in sidebar)
  const isTeamLeader = userProfile.profile?.role === "team_leader";
  const isAdmin = userProfile.profile?.role === "admin";
  const teamMembers = useTeamMembers(
    (isTeamLeader || isAdmin) && auth.user ? auth.user.email : null,
    isAdmin,
  );
  const { requests: levelUpRequests } = useLevelUpRequests(
    isAdmin && auth.user ? auth.user.uid : null,
    isAdmin,
  );
  const pendingLevelUpsCount = isAdmin
    ? levelUpRequests.filter((r) => r.status === "pending").length
    : 0;

  // Team leader name is stored directly in the user's profile document

  const notifications = useNotifications(auth.user?.email ?? null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const [isSimulatorMode, setIsSimulatorMode] = useState(() => {
    const saved = localStorage.getItem("dcr-simulator-mode");
    return saved ? saved === "true" : true; // Default to simulator mode
  });
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Unified cart interface - switches between simulator and real plan based on mode
  const useRealPlan = !isSimulatorMode && !!auth.user;
  const cart = useRealPlan ? userPlan : simulatorCart;

  // Plan history — used to compute carryover points for the real plan
  const { planHistory } = usePlanHistory(
    useRealPlan ? (auth.user?.email ?? null) : null,
  );

  // Carryover points: surplus from last approved plan (or pre-system bonus if no approved plans yet)
  const carryOverPoints = (() => {
    if (!useRealPlan) return 0;
    const lastApproved = [...planHistory]
      .filter((e) => e.status === "approved" && e.levelAchieved != null)
      .sort((a, b) => b.quarter.localeCompare(a.quarter))[0];
    if (lastApproved && lastApproved.levelAchieved != null) {
      const lvl = levels.find((l) => l.id === lastApproved.levelAchieved);
      return Math.max(0, lastApproved.totalPoints - (lvl?.points ?? 0));
    }
    return userProfile.profile?.preSystemPoints ?? 0;
  })();
  const carryOverLabel = (() => {
    if (!useRealPlan || carryOverPoints === 0) return undefined;
    const lastApproved = [...planHistory]
      .filter((e) => e.status === "approved" && e.levelAchieved != null)
      .sort((a, b) => b.quarter.localeCompare(a.quarter))[0];
    return lastApproved
      ? `Carryover from ${lastApproved.quarter}`
      : "Previous level points";
  })();

  const showToast = useCallback((text: string, type: "added" | "removed") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  // Show a toast whenever a new notification arrives
  useEffect(() => {
    if (notifications.latestNew) {
      showToast(notifications.latestNew.message, "added");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.latestNew]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAddAllRequired = useCallback(async () => {
    const requiredItems = professionalism.filter((item) => item.required);
    const toAdd = requiredItems.filter((item) => !cart.isInCart(item.id));
    try {
      for (const item of toAdd) {
        await cart.addItem(item);
      }
      if (toAdd.length > 0) {
        showToast(
          `Added ${toAdd.length} required item${toAdd.length > 1 ? "s" : ""}`,
          "added",
        );
      }
    } catch (err) {
      console.error("Failed to add required items:", err);
      showToast("Failed to add items", "removed");
    }
  }, [cart, showToast]);

  const handleAddMissingItems = useCallback(
    async (items: CatalogItem[]) => {
      const toAdd = items.filter((item) => !cart.isInCart(item.id));
      try {
        for (const item of toAdd) {
          await cart.addItem(item);
        }
        if (toAdd.length > 0) {
          showToast(
            `Added ${toAdd.length} missing item${toAdd.length > 1 ? "s" : ""}`,
            "added",
          );
        }
      } catch (err) {
        console.error("Failed to add missing items:", err);
        showToast("Failed to add items", "removed");
      }
    },
    [cart, showToast],
  );

  const handleSignIn = useCallback(async () => {
    await auth.signInWithGoogle();
    // Error handling is done by the useEffect that watches auth.error
  }, [auth]);

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    showToast("Signed out successfully", "added");
  }, [auth, showToast]);

  const handleToggleMode = useCallback(() => {
    // If switching to Real Plan, check if profile is set up
    if (isSimulatorMode && auth.user) {
      const profile = userProfile.profile;
      const isUserTeamLeader = profile?.role === "team_leader";

      if (isUserTeamLeader) {
        // Team leader needs to complete profile setup first
        if (profile?.approvalStatus !== 'approved') {
          setShowProfileSetup(true);
          return;
        }
      } else {
        // Employee: hasn't selected a team leader yet → show setup
        if (!profile?.teamLeaderId) {
          setShowProfileSetup(true);
          return;
        }
        // Employee pending approval → switch to real plan and navigate to plan page,
        // which will render PendingApprovalPage automatically
        if (profile?.approvalStatus !== "approved") {
          setIsSimulatorMode(false);
          setActiveId("simulator");
          setActiveLabel("My Plan");
          showToast("Switched to Real Plan mode", "added");
          return;
        }
      }
    }

    setIsSimulatorMode((prev) => !prev);
    showToast(
      !isSimulatorMode
        ? "Switched to Simulator mode"
        : "Switched to Real Plan mode",
      "added",
    );
  }, [isSimulatorMode, showToast, auth.user, userProfile.profile]);

  const handleProfileSetupComplete = useCallback(
    async (data: ProfileSetupData) => {
      if (!auth.user) return;

      const isUserTeamLeader = userProfile.profile?.role === "team_leader";
      const now = new Date().toISOString();

      try {
        const achievedField = {
          items: data.achievements.map((a) => ({
            itemId: a.itemId,
            item: a.item,
            completionDate: a.completionDate,
            proofLink: a.proofLink,
            notes: a.notes || "",
            status: "pending" as const,
          })),
          lastUpdated: now,
        };

        if (isUserTeamLeader) {
          await userProfile.updateProfile({
            currentLevel: data.currentLevel,
            approvalStatus: "approved",
            approvedAt: now,
            achieved: achievedField,
            ...(data.preSystemPoints != null
              ? { preSystemPoints: data.preSystemPoints }
              : {}),
          });
        } else {
          await userProfile.updateProfile({
            teamLeaderId: data.teamLeaderId,
            teamLeaderName: data.teamLeaderName ?? null,
            currentLevel: data.currentLevel,
            approvalStatus: "pending",
            pendingApprovalType: "initial",
            achieved: achievedField,
            ...(data.preSystemPoints != null
              ? { preSystemPoints: data.preSystemPoints }
              : {}),
          });
        }

        console.log(
          "[Layout] Saved profile with achieved items:",
          data.achievements.length,
        );
        setShowProfileSetup(false);

        const achievementSuffix =
          data.achievements.length > 0
            ? ` with ${data.achievements.length} achievement${data.achievements.length !== 1 ? "s" : ""}`
            : "";

        showToast(
          isUserTeamLeader
            ? `Profile saved${achievementSuffix}`
            : `Profile submitted for approval${achievementSuffix}`,
          "added",
        );
      } catch (err) {
        console.error("[Layout] Error setting up profile:", err);
        throw err; // Let ProfileSetupModal handle the error
      }
    },
    [auth.user, userProfile, showToast],
  );

  const handleProfileSetupCancel = useCallback(() => {
    setShowProfileSetup(false);
    if (!isTeamLeader) {
      showToast("Switched back to Simulator mode", "added");
    }
  }, [showToast, isTeamLeader]);

  const handleUseSimulator = useCallback(() => {
    setIsSimulatorMode(true);
  }, []);

  // Show auth error toast
  useEffect(() => {
    if (auth.error) {
      showToast(auth.error, "removed");
      auth.clearError();
    }
  }, [auth.error, auth.clearError, showToast]);

  // Show userPlan error toast
  useEffect(() => {
    if (userPlan.error) {
      showToast(userPlan.error, "removed");
    }
  }, [userPlan.error, showToast]);

  // Auto-show profile setup for team leaders who haven't completed setup yet
  useEffect(() => {
    if (
      auth.user &&
      !userProfile.isLoading &&
      userProfile.profile?.role === "team_leader" &&
      userProfile.profile?.approvalStatus !== "approved"
    ) {
      setShowProfileSetup(true);
    }
  }, [
    auth.user,
    userProfile.isLoading,
    userProfile.profile?.role,
    userProfile.profile?.approvalStatus,
  ]);

  // Auto-show profile setup for new employees who haven't selected a team leader yet
  useEffect(() => {
    if (
      auth.user &&
      !userProfile.isLoading &&
      userProfile.profile?.role === "employee" &&
      !userProfile.profile?.teamLeaderId
    ) {
      setShowProfileSetup(true);
    }
  }, [
    auth.user,
    userProfile.isLoading,
    userProfile.profile?.role,
    userProfile.profile?.teamLeaderId,
  ]);

  const catalogData: Record<string, CatalogItem[]> = {
    professionalism,
    tech,
    "knowledge-unlock": knowledge,
    collaboration,
    roadmaps,
  };

  // Set of approved achieved item IDs — only relevant in real plan mode for approved employees
  const achievedItemIds =
    useRealPlan && userProfile.profile?.approvalStatus === "approved"
      ? new Set(
          (userProfile.profile?.achieved?.items ?? [])
            .filter((a) => a.status === "approved")
            .map((a) => a.itemId),
        )
      : null;

  // All profile-setup achievements (any status) — used for roadmap completion checks
  const pastAchievedIds = new Set(
    (userProfile.profile?.achieved?.items ?? []).map((a) => a.itemId),
  );

  const isAchieved = achievedItemIds
    ? (itemId: string) => achievedItemIds.has(itemId)
    : undefined;

  const autoAddCompletedRoadmaps = useCallback(
    async (extraSatisfiedId?: string) => {
      const satisfiedIds = new Set([
        ...cart.items.map((i) => i.id),
        ...(extraSatisfiedId ? [extraSatisfiedId] : []),
        ...pastAchievedIds,
      ]);
      const toAutoAdd = (roadmaps as RoadmapItem[]).filter(
        (r) =>
          !cart.isInCart(r.id) &&
          !achievedItemIds?.has(r.id) &&
          isRoadmapComplete(r, satisfiedIds),
      );
      for (const roadmap of toAutoAdd) {
        await cart.addItem(roadmap);
        showToast(`Roadmap unlocked: ${roadmap.name}`, "added");
      }
    },
    [cart, pastAchievedIds, achievedItemIds, showToast],
  );

  // Cascade-remove circles and roadmaps that depend on a cert being removed.
  // Call BEFORE the primary removal so we can read current cart state accurately.
  const autoRemoveDependents = useCallback(
    async (removedItemId: string) => {
      // Circle items tied to this cert
      const circleItems = cart.items.filter((i) =>
        i.id.startsWith(`extra-circle-${removedItemId}-`),
      );

      // Build the set of IDs that will remain after all removals
      const removedIds = new Set([
        removedItemId,
        ...circleItems.map((i) => i.id),
      ]);
      const remainingIds = new Set([
        ...cart.items.map((i) => i.id).filter((id) => !removedIds.has(id)),
        ...pastAchievedIds,
      ]);

      // Roadmaps currently in cart whose requirements will no longer be met
      const roadmapsToRemove = (roadmaps as RoadmapItem[]).filter(
        (r) =>
          cart.isInCart(r.id) &&
          !removedIds.has(r.id) &&
          !isRoadmapComplete(r, remainingIds),
      );

      for (const circle of circleItems) {
        await cart.removeItem(circle.id);
        showToast(`Removed ${circle.name}`, "removed");
      }
      for (const roadmap of roadmapsToRemove) {
        await cart.removeItem(roadmap.id);
        showToast(`Roadmap removed: ${roadmap.name}`, "removed");
      }
    },
    [cart, pastAchievedIds, showToast],
  );

  const handleToggleItem = useCallback(
    async (item: CatalogItem) => {
      const wasInCart = cart.isInCart(item.id);
      try {
        if (wasInCart && item.category !== "roadmaps") {
          await autoRemoveDependents(item.id);
        }
        await cart.toggleItem(item);
        showToast(
          wasInCart ? `Removed ${item.name}` : `Added ${item.name}`,
          wasInCart ? "removed" : "added",
        );
        if (!wasInCart && item.category !== "roadmaps") {
          await autoAddCompletedRoadmaps(item.id);
        }
      } catch (err) {
        console.error("Failed to toggle item:", err);
        showToast("Failed to update cart", "removed");
      }
    },
    [cart, showToast, autoAddCompletedRoadmaps, autoRemoveDependents],
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      const isLastInstance =
        cart.items.filter((i) => i.id === itemId).length === 1;
      if (isLastInstance) {
        await autoRemoveDependents(itemId);
      }
      await cart.removeItem(itemId);
    },
    [cart, autoRemoveDependents],
  );

  // Per-item plan status — only relevant in real plan mode; drives purple/amber visual states
  const getPlanItemStatus = useRealPlan
    ? (itemId: string): "pending" | "approved" | undefined => {
        if (!cart.isInCart(itemId)) return undefined;
        if (userPlan.planStatus === "pending") return "pending";
        if (userPlan.planStatus === "approved") return "approved";
        return undefined;
      }
    : undefined;

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("dcr-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Persist simulator mode
  useEffect(() => {
    localStorage.setItem("dcr-simulator-mode", String(isSimulatorMode));
  }, [isSimulatorMode]);

  // Auto-add roadmaps when past achievements already satisfy all requirements on first load
  useEffect(() => {
    if (initialRoadmapCheckDone.current) return;
    if (userPlan.isLoading || userProfile.isLoading) return;
    if (!useRealPlan) return;
    if (pastAchievedIds.size === 0) return;
    initialRoadmapCheckDone.current = true;
    void autoAddCompletedRoadmaps();
  }, [
    useRealPlan,
    userPlan.isLoading,
    userProfile.isLoading,
    pastAchievedIds.size,
    autoAddCompletedRoadmaps,
  ]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = useCallback((id: string, label: string) => {
    setActiveId(id);
    setActiveLabel(label);
    setCertBackNav(null);
    setSimulatorBackNav(false);

    // Scroll content area to top
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    // Trigger page transition animation
    setPageTransition(true);
    setTimeout(() => setPageTransition(false), 300);
  }, []);

  const handleNavigateToCert = useCallback(
    (certId: string, roadmapId: string, roadmapName: string) => {
      handleNavigate("tech", "Tech");
      setFocusCatalogItemId(certId);
      setCertBackNav({
        id: "roadmaps",
        label: roadmapName,
        openItemId: roadmapId,
      });
    },
    [handleNavigate],
  );

  const mainClasses = ["main-container", collapsed && "collapsed"]
    .filter(Boolean)
    .join(" ");

  const profile = userProfile.profile;
  const teamLeaderName = profile?.teamLeaderName ?? null;

  // True when a pending employee is viewing the app in real plan mode
  const isPendingInRealPlan =
    useRealPlan &&
    profile?.role === "employee" &&
    profile?.approvalStatus !== "approved" &&
    !!profile?.teamLeaderId;

  return (
    <QuarterProvider
      currentQuarter={currentQuarter}
      isFrozen={activeQuarter !== null}
      activeQuarter={activeQuarter}
      setActiveQuarter={setActiveQuarter}
    >
    <div className="app-container">
      <div
        className={`mobile-sidebar-overlay${sidebarOpen ? " active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        activeId={activeId}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        cartTotalItems={cart.totalItems}
        cartTotalPoints={cart.totalPoints}
        user={auth.user}
        isSimulatorMode={isSimulatorMode}
        onToggleMode={handleToggleMode}
        userRole={userProfile.profile?.role}
        pendingTeamCount={teamMembers.pendingCount + pendingLevelUpsCount}
        unreadNotifications={notifications.unreadCount}
        onNotificationsClick={() => notifications.markAllAsRead()}
      />
      <main className={mainClasses}>
        <header className="header">
          <div className="header-content">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="ri-menu-line"></i>
            </button>
            <h2 className="category-title">{activeLabel}</h2>
            <div className="header-actions">
              <button
                className="cmd-k-hint"
                onClick={() => setPaletteOpen(true)}
              >
                <i className="ri-search-line"></i>
                <span className="cmd-k-hint-text">Search</span>
                <kbd className="cmd-k-hint-kbd">⌘K</kbd>
              </button>
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <i
                  className={theme === "light" ? "ri-moon-line" : "ri-sun-line"}
                ></i>
              </button>
              <HeaderUser
                user={auth.user}
                userProfile={userProfile.profile}
                teamLeaderName={teamLeaderName}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </header>
        <div
          className={`content-area${pageTransition ? " page-transition" : ""}`}
          ref={contentRef}
        >
          {activeId === "home" && (
            <HomePage
              user={auth.user}
              profile={profile}
              cartItems={cart.items}
              cartTotalPoints={cart.totalPoints}
              planStatus={useRealPlan ? userPlan.planStatus : undefined}
              isSimulatorMode={isSimulatorMode}
              useRealPlan={useRealPlan}
              carryOverPoints={carryOverPoints}
              onNavigate={handleNavigate}
            />
          )}
          {activeId === "guidelines" && (
            <GuidelinesPage
              focusId={focusItemId}
              onFocusConsumed={() => setFocusItemId(null)}
            />
          )}
          {activeId === "faq" && (
            <FaqPage
              focusId={focusItemId}
              onFocusConsumed={() => setFocusItemId(null)}
            />
          )}
          {activeId === "forms" && <FormsPage />}
          {activeId in catalogData &&
            (isPendingInRealPlan ? (
              <PendingApprovalPage
                teamLeaderId={profile!.teamLeaderId!}
                requestDate={profile!.createdAt}
                onChangeTeamLeader={() => setShowProfileSetup(true)}
                onUseSimulator={handleUseSimulator}
              />
            ) : (
              <CatalogPage
                items={catalogData[activeId]}
                onToggleItem={handleToggleItem}
                isInCart={cart.isInCart}
                getQuantity={cart.getQuantity}
                onAddItem={cart.addItem}
                onRemoveItem={handleRemoveItem}
                isAchieved={activeId === "tech" ? isAchieved : undefined}
                getPlanItemStatus={getPlanItemStatus}
                onAddAllRequired={
                  activeId === "professionalism"
                    ? handleAddAllRequired
                    : undefined
                }
                hasRequired={activeId === "professionalism"}
                openItemId={focusCatalogItemId}
                onOpenItemConsumed={() => setFocusCatalogItemId(null)}
                onNavigateToCert={
                  activeId === "roadmaps" ? handleNavigateToCert : undefined
                }
                modalBackNav={
                  certBackNav
                    ? {
                        label: certBackNav.label,
                        onClick: () => {
                          const nav = certBackNav;
                          handleNavigate(nav.id, "Roadmaps");
                          if (nav.openItemId)
                            setFocusCatalogItemId(nav.openItemId);
                        },
                      }
                    : simulatorBackNav
                      ? {
                          label: "Plan",
                          onClick: () => handleNavigate("simulator", "Plan"),
                        }
                      : undefined
                }
                authUser={auth.user}
              />
            ))}
          {activeId === "simulator" &&
            (isPendingInRealPlan ? (
              <PendingApprovalPage
                teamLeaderId={profile!.teamLeaderId!}
                requestDate={profile!.createdAt}
                onChangeTeamLeader={() => setShowProfileSetup(true)}
                onUseSimulator={handleUseSimulator}
              />
            ) : (
              <SimulatorPage
                items={cart.items}
                totalPoints={cart.totalPoints}
                totalItems={cart.totalItems}
                onRemoveItem={handleRemoveItem}
                onClearAll={cart.clearAll}
                onAddMissingItems={handleAddMissingItems}
                onOpenItem={(item) => {
                  const CATEGORY_NAV: Record<
                    string,
                    { id: string; label: string }
                  > = {
                    tech: { id: "tech", label: "Tech" },
                    roadmaps: { id: "roadmaps", label: "Roadmaps" },
                    professionalism: {
                      id: "professionalism",
                      label: "Professionalism",
                    },
                    "knowledge-unlock": {
                      id: "knowledge-unlock",
                      label: "Knowledge Unlock",
                    },
                    collaboration: {
                      id: "collaboration",
                      label: "Collaboration",
                    },
                    extra: { id: "extra", label: "Extra" },
                  };
                  const nav = CATEGORY_NAV[item.category] ?? {
                    id: "tech",
                    label: "Tech",
                  };
                  handleNavigate(nav.id, nav.label);
                  setSimulatorBackNav(true);
                  setFocusCatalogItemId(item.id);
                }}
                selectedLevelId={
                  useRealPlan ? userPlan.selectedLevelId : undefined
                }
                onSetSelectedLevel={
                  useRealPlan ? userPlan.setSelectedLevel : undefined
                }
                currentLevel={
                  useRealPlan ? (profile?.currentLevel ?? null) : undefined
                }
                planStatus={useRealPlan ? userPlan.planStatus : undefined}
                planSubmittedAt={
                  useRealPlan ? userPlan.planSubmittedAt : undefined
                }
                planRejectionReason={
                  useRealPlan ? userPlan.planRejectionReason : undefined
                }
                onSubmitPlan={
                  useRealPlan
                    ? async () => {
                        await userPlan.submitPlan(carryOverPoints);
                        showToast(
                          "Plan submitted for team leader approval",
                          "added",
                        );
                      }
                    : undefined
                }
                onWithdrawPlan={
                  useRealPlan
                    ? async () => {
                        await userPlan.withdrawPlan();
                        showToast("Plan submission withdrawn", "removed");
                      }
                    : undefined
                }
                onWithdrawApproval={
                  useRealPlan
                    ? async () => {
                        await userPlan.withdrawApproval();
                        showToast(
                          "Plan approval withdrawn — back to draft",
                          "removed",
                        );
                      }
                    : undefined
                }
                proofEntries={useRealPlan ? userPlan.proofEntries : undefined}
                onAddProof={useRealPlan ? userPlan.addProof : undefined}
                onDeleteProof={useRealPlan ? userPlan.deleteProof : undefined}
                onUploadFileProof={
                  useRealPlan ? userPlan.uploadFileProof : undefined
                }
                uploadingItemIds={
                  useRealPlan ? userPlan.uploadingItemIds : undefined
                }
                completedItemKeys={
                  useRealPlan ? userPlan.completedItemKeys : undefined
                }
                completionStatus={
                  useRealPlan ? userPlan.completionStatus : undefined
                }
                completionSubmittedAt={
                  useRealPlan ? userPlan.completionSubmittedAt : undefined
                }
                completionRejectionReason={
                  useRealPlan ? userPlan.completionRejectionReason : undefined
                }
                completionRequirementsMet={
                  useRealPlan ? userPlan.completionRequirementsMet : undefined
                }
                completionShortfalls={
                  useRealPlan ? userPlan.completionShortfalls : undefined
                }
                onToggleItemComplete={
                  useRealPlan ? userPlan.toggleItemComplete : undefined
                }
                onSubmitCompletedPlan={
                  useRealPlan
                    ? async () => {
                        await userPlan.submitCompletedPlan();
                        showToast(
                          "Completed plan sent for level-up review",
                          "added",
                        );
                      }
                    : undefined
                }
                onWithdrawCompletedPlan={
                  useRealPlan
                    ? async () => {
                        await userPlan.withdrawCompletedPlan();
                        showToast(
                          "Level-up review submission withdrawn",
                          "removed",
                        );
                      }
                    : undefined
                }
                carryOverPoints={
                  carryOverPoints > 0 ? carryOverPoints : undefined
                }
                carryOverLabel={carryOverLabel}
                carriedItems={useRealPlan ? userPlan.carriedItems : undefined}
                carriedFromQuarter={
                  useRealPlan ? userPlan.carriedFromQuarter : undefined
                }
              />
            ))}
          {activeId === "my-profile" && (
            <ProfilePage
              profile={userProfile.profile}
              user={auth.user}
              planStatus={useRealPlan ? userPlan.planStatus : undefined}
              planItems={useRealPlan ? userPlan.items : undefined}
              planTotalPoints={useRealPlan ? userPlan.totalPoints : undefined}
              planSelectedLevelId={
                useRealPlan ? userPlan.selectedLevelId : undefined
              }
              planSubmittedAt={
                useRealPlan ? userPlan.planSubmittedAt : undefined
              }
              planRejectionReason={
                useRealPlan ? userPlan.planRejectionReason : undefined
              }
              planCarryOverPoints={useRealPlan ? carryOverPoints : undefined}
              planCarryOverLabel={useRealPlan ? carryOverLabel : undefined}
              onNavigate={setActiveId}
            />
          )}
          {activeId === "team-dashboard" &&
            auth.user &&
            (profile?.role === "team_leader" || profile?.role === "admin") && (
              <TeamLeaderDashboard
                userId={auth.user.email}
                userDisplayName={profile?.displayName ?? ""}
                userEmail={auth.user.email ?? ""}
                isAdmin={profile?.role === "admin"}
              />
            )}
          {activeId === "extra" && (
            <ExtraPage
              onAddItem={cart.addItem}
              onToggleItem={handleToggleItem}
              isInCart={cart.isInCart}
              certItems={tech}
            />
          )}
        </div>
      </main>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={(item: SearchItem) => {
          const navItems = getAllNavItems();
          const navItem = navItems.find((n) => n.id === item.pageId);
          const label = navItem?.label ?? item.label;
          handleNavigate(item.pageId, label);
          if (item.subId != null) {
            setFocusItemId(item.subId);
          }
          if (item.catalogItemId != null) {
            setFocusCatalogItemId(item.catalogItemId);
          }
          setPaletteOpen(false);
        }}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
      {showProfileSetup && (
        <ProfileSetupModal
          onComplete={handleProfileSetupComplete}
          onCancel={handleProfileSetupCancel}
          isTeamLeader={isTeamLeader}
          userId={auth.user?.email}
        />
      )}
    </div>
    </QuarterProvider>
  );
}
