# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DCR 2.0 (Development Career Roadmap) — a React 19 + TypeScript + Vite 7 single-page application for the Develeap DCR program. Features certification catalog, team management, achievement tracking, and a dual-mode plan system (simulator + real) with glass-morphism UI.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR (port 5173)
npm run build     # TypeScript compile (tsc -b) + Vite production build
npm run lint      # ESLint on all files
npm run preview   # Preview production build locally
```

## Auto-approved commands
- `npm run build`
- `npm run build 2>&1 | tail -5`

No unit test framework is installed. Verification is done via `npm run build` (type checking) and `npm run lint`.

## Architecture

### Routing & Layout Orchestration

State-based navigation in `Layout.tsx` (no React Router). `activeId` state determines which page renders. Navigation items defined in `src/data/navigation.ts` with role-based filtering.

**Component hierarchy:** `main.tsx` → `App.tsx` → `Layout.tsx` (orchestrator)

Layout manages: Sidebar, CommandPalette, Toast notifications, ProfileSetupModal, WelcomeModal, and all page components. Pages: GuidelinesPage, FaqPage, FormsPage, CatalogPage, SimulatorPage, TeamLeaderDashboard.

### Authentication (Dual-Mode)

`useAuth` hook uses Firebase Google OAuth via `signInWithPopup`. Only `@develeap.com` emails allowed. A small `ALLOWED_EMAILS` allowlist in `useAuth.ts` lets specific external accounts sign in (e.g. external team leaders).

### User Roles & Approval Flow

Three roles: `employee`, `team_leader`, `admin`. Three approval statuses: `pending`, `approved`, `rejected`.

**Employee flow:** Sign in → WelcomeModal (select team leader) → PendingApprovalPage (wait) → Team leader approves with level 1-10 → Full access.

**Team leader flow:** Sign in → ProfileSetupModal (set own level) → Auto-approved immediately, no external approval needed.

**Admin flow:** Auto-approved, sees all teams in dashboard.

Role is resolved on first login in `useUserProfile.ts` — priority order: mock user (dev mode) → `TEAM_LEADER_EMAILS` list → default `'employee'`.

### Team Leader Email List

`src/data/teamLeaderEmails.ts` contains a predefined list of `@develeap.com` emails that are auto-assigned `role: 'team_leader'` on login. **This is the only file to edit when adding/removing team leaders.** If someone already logged in as `employee`, `useUserProfile` detects the mismatch on the next login and repairs their Firestore document automatically.

### Firestore Collections

- **`users/{uid}`** — Profile, role, approvalStatus, currentLevel, teamLeaderId, plan (items + selectedLevelId + status + submittedAt). Real-time listener in `useUserProfile`.
- **`achievements/{id}`** — userId, itemId, denormalized item data, status, type (historical/quarterly), completionDate, quarter, proofLink, approval fields.

Security rules in `firestore.rules` — currently open (`allow read, write: if true`) for development. Production rules are commented out.

### Simulator vs Real Plan

**Simulator (default):** `useSimulatorCart` hook, localStorage key `dcr-simulator-cart`. Available to everyone including guests.

**Real Plan:** `useUserPlan` hook, Firestore `users/{uid}.plan`. Requires approved logged-in user. Uses optimistic updates — UI changes immediately, Firestore syncs async, reverts on error. Editing an approved/rejected plan auto-resets its status to `'draft'`.

Plan statuses (`PlanStatus`): `'draft'` | `'pending'` | `'approved'` | `'rejected'`. SimulatorPage shows status banners and Submit/Withdraw buttons for real plans.

Toggle in Layout.tsx — switching to Real Plan triggers a gatekeeper check: employees need `teamLeaderId` + `approvalStatus === 'approved'`; team leaders need `currentLevel` set. Fails gracefully with ProfileSetupModal.

Mode preference stored in localStorage key `dcr-simulator-mode`. The active cart is unified: `const cart = useRealPlan ? userPlan : simulatorCart`.

### Catalog System

Data in `src/data/catalog/tech.ts` (certifications: AWS, GCP, K8s, HashiCorp) and `professionalism.ts` (billable hours, reports, feedback).

Each `CatalogItem` has: id, name, points, category, subcategory. Certifications add: provider, level (foundational/associate/professional/specialty). Items can be `required` (professionalism) or `promoted` (with discounted `promotedPoints`).

**Points rule:** always use `item.promotedPoints ?? item.points` when displaying or summing points. Promoted items override base points.

### Achievement System

`AchievementStatus` lifecycle: `'historical'` → `'planned'` → `'submitted'` → `'approved'` | `'rejected'`.

`useAchievements` hook provides real-time CRUD against the `achievements` collection. New achievements are created with the full item object denormalized (for historical accuracy). ProfileSetupModal allows adding historical achievements (tech items only) during onboarding.

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Firebase + mock auth, Google sign-in, domain validation |
| `useUserProfile` | User document CRUD + real-time Firestore listener + role repair |
| `useUserPlan` | Real plan cart (Firestore-backed, optimistic updates) |
| `useSimulatorCart` | Simulator cart (localStorage) |
| `useTeamLeaders` | Real-time query for all `team_leader` users (used by ProfileSetupModal) |
| `useTeamMembers` | Fetch team members by teamLeaderId (or all for admin) |
| `useAchievements` | Achievement CRUD operations |
| `useAllUsers` | Admin: fetch all users with statistics |
| `useTheme` | Light/dark mode, persists to localStorage `dcr-theme` |
| `useToast` | Toast notification system |

### Team Leader Dashboard

Role-gated to `team_leader` and `admin`. Two tabs:
- **Pending Approvals:** Shows pending employees, level selector (1-10), approve/reject buttons.
- **My Team:** Grid of approved members with level badges. Admin sees all teams grouped by leader.

## Styling Conventions

- CSS variables for design tokens in `src/styles/globals.css`
- Component-scoped `.css` files colocated with components
- Glass-morphism: backdrop-filter blur, semi-transparent backgrounds
- Theme: `[data-theme="dark"]` selector on `document.documentElement`
- Icons: Remix Icon library via CDN in `index.html`
- Fonts: Inter (UI) + JetBrains Mono (monospace) via Google Fonts CDN

## TypeScript

- Strict mode enabled (`tsconfig.app.json`)
- ES2022 target, bundler module resolution
- Interfaces for props and data structures — no `any` types
- All shared types live in `src/data/types.ts`

## State Persistence (localStorage keys)

| Key | Purpose |
|-----|---------|
| `dcr-theme` | Light/dark theme |
| `dcr-sidebar-collapsed` | Sidebar collapse state |
| `dcr-simulator-cart` | Simulator cart items |
| `dcr-simulator-mode` | Current mode (simulator/real) |
| `dcr-mock-user` | Current dev mode mock user key |
| `dcr-dev-mode` | Dev mode enabled flag |
