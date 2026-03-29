/**
 * Dev-mode mock users for local testing.
 *
 * Each entry has a stable fake UID used as the Firestore document key,
 * so plan data, achievements, etc. persist across page reloads in dev mode.
 *
 * Activate dev mode: navigate to http://localhost:5173/?dev=true
 * or set localStorage.setItem('dcr-dev-mode', 'true') + reload.
 */
import { doc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AuthUser } from '../hooks/useAuth';
import type { UserDocument } from './types';

export interface MockUser {
  key: string;
  label: string;
  description: string;
  authUser: AuthUser;
  profile: UserDocument;
}

const BASE_TL_NAME = 'Dev Team Leader';
const BASE_TL_EMAIL = 'dev.tl@develeap.com';

const now = new Date().toISOString();

const MOCK_USERS: MockUser[] = [
  // ─── Guest ──────────────────────────────────────────────────────────────
  // (no authUser / profile — handled as null in useAuth/useUserProfile)

  // ─── New employee: just signed up, no team leader selected yet ──────────
  {
    key: 'new_employee',
    label: 'New Employee',
    description: 'Fresh signup — triggers WelcomeModal (no TL selected yet)',
    authUser: {
      uid: 'mock_new_employee',
      email: 'dev.new@develeap.com',
      displayName: 'Dev New Employee',
      photoURL: null,
    },
    profile: {
      email: 'dev.new@develeap.com',
      displayName: 'Dev New Employee',
      photoURL: null,
      createdAt: now,
      role: 'employee',
      teamLeaderId: null,
      teamLeaderName: null,
      approvalStatus: 'pending',
      pendingApprovalType: 'initial',
      currentLevel: null,
      joinedCompanyAt: null,
      approvedAt: null,
      plan: { items: [], selectedLevelId: 0, lastUpdated: now },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Pending employee: picked a TL, waiting for approval ────────────────
  {
    key: 'pending_employee',
    label: 'Pending Employee',
    description: 'Picked a TL, waiting for approval — shows PendingApprovalPage',
    authUser: {
      uid: 'mock_pending_employee',
      email: 'dev.pending@develeap.com',
      displayName: 'Dev Pending Employee',
      photoURL: null,
    },
    profile: {
      email: 'dev.pending@develeap.com',
      displayName: 'Dev Pending Employee',
      photoURL: null,
      createdAt: now,
      role: 'employee',
      teamLeaderId: BASE_TL_EMAIL,
      teamLeaderName: BASE_TL_NAME,
      approvalStatus: 'pending',
      pendingApprovalType: 'initial',
      currentLevel: null,
      joinedCompanyAt: null,
      approvedAt: null,
      plan: { items: [], selectedLevelId: 0, lastUpdated: now },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Approved employee: has level 3, can use Real Plan ──────────────────
  {
    key: 'approved_employee',
    label: 'Approved Employee (L3)',
    description: 'Approved, level 3 — full access, Real Plan works',
    authUser: {
      uid: 'mock_approved_employee',
      email: 'dev.approved@develeap.com',
      displayName: 'Dev Approved Employee',
      photoURL: null,
    },
    profile: {
      email: 'dev.approved@develeap.com',
      displayName: 'Dev Approved Employee',
      photoURL: null,
      createdAt: now,
      role: 'employee',
      teamLeaderId: BASE_TL_EMAIL,
      teamLeaderName: BASE_TL_NAME,
      approvalStatus: 'approved',
      currentLevel: 3,
      joinedCompanyAt: now,
      approvedAt: now,
      levelHistory: [{ level: 3, date: now, quarter: null }],
      plan: { items: [], selectedLevelId: 0, lastUpdated: now },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Employee with plan submitted ────────────────────────────────────────
  {
    key: 'employee_plan_submitted',
    label: 'Employee — Plan Submitted',
    description: 'Plan submitted & pending TL review',
    authUser: {
      uid: 'mock_employee_plan_submitted',
      email: 'dev.submitted@develeap.com',
      displayName: 'Dev Submitted Employee',
      photoURL: null,
    },
    profile: {
      email: 'dev.submitted@develeap.com',
      displayName: 'Dev Submitted Employee',
      photoURL: null,
      createdAt: now,
      role: 'employee',
      teamLeaderId: BASE_TL_EMAIL,
      teamLeaderName: BASE_TL_NAME,
      approvalStatus: 'approved',
      currentLevel: 3,
      joinedCompanyAt: now,
      approvedAt: now,
      levelHistory: [{ level: 3, date: now, quarter: null }],
      plan: {
        items: [],
        selectedLevelId: 4,
        lastUpdated: now,
        planStatus: 'pending',
        planSubmittedAt: now,
        quarter: 'Q1-2026',
      },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Employee with plan approved (no level-up) ───────────────────────────
  {
    key: 'employee_plan_approved',
    label: 'Employee — Plan Approved',
    description: 'Plan approved by TL, can mark completions',
    authUser: {
      uid: 'mock_employee_plan_approved',
      email: 'dev.planapproved@develeap.com',
      displayName: 'Dev Plan-Approved Employee',
      photoURL: null,
    },
    profile: {
      email: 'dev.planapproved@develeap.com',
      displayName: 'Dev Plan-Approved Employee',
      photoURL: null,
      createdAt: now,
      role: 'employee',
      teamLeaderId: BASE_TL_EMAIL,
      teamLeaderName: BASE_TL_NAME,
      approvalStatus: 'approved',
      currentLevel: 3,
      joinedCompanyAt: now,
      approvedAt: now,
      levelHistory: [{ level: 3, date: now, quarter: null }],
      plan: {
        items: [],
        selectedLevelId: 3,
        lastUpdated: now,
        planStatus: 'approved',
        planSubmittedAt: now,
        quarter: 'Q1-2026',
        levelAchievedOnApproval: null,
        completionStatus: 'in_progress',
        completedItemKeys: [],
      },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Fresh team leader (no level set yet) ───────────────────────────────
  {
    key: 'tl_fresh',
    label: 'Team Leader (Fresh)',
    description: 'First login — triggers ProfileSetupModal (no level set)',
    authUser: {
      uid: 'mock_tl_fresh',
      email: 'dev.tlfresh@develeap.com',
      displayName: 'Dev Fresh TL',
      photoURL: null,
    },
    profile: {
      email: 'dev.tlfresh@develeap.com',
      displayName: 'Dev Fresh TL',
      photoURL: null,
      createdAt: now,
      role: 'team_leader',
      teamLeaderId: null,
      teamLeaderName: null,
      approvalStatus: 'approved',
      currentLevel: null,
      joinedCompanyAt: now,
      approvedAt: now,
      plan: { items: [], selectedLevelId: 0, lastUpdated: now },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Team leader with pending employees & submitted plans ───────────────
  {
    key: 'tl_setup',
    label: 'Team Leader (Active)',
    description: 'Has pending employees + submitted plans to review',
    authUser: {
      uid: 'mock_tl_setup',
      email: BASE_TL_EMAIL,
      displayName: BASE_TL_NAME,
      photoURL: null,
    },
    profile: {
      email: BASE_TL_EMAIL,
      displayName: BASE_TL_NAME,
      photoURL: null,
      createdAt: now,
      role: 'team_leader',
      teamLeaderId: null,
      teamLeaderName: null,
      approvalStatus: 'approved',
      currentLevel: 7,
      joinedCompanyAt: now,
      approvedAt: now,
      levelHistory: [{ level: 7, date: now, quarter: null }],
      plan: { items: [], selectedLevelId: 0, lastUpdated: now },
      achieved: { items: [], lastUpdated: now },
    },
  },

  // ─── Admin ───────────────────────────────────────────────────────────────
  {
    key: 'admin',
    label: 'Admin',
    description: 'Sees all teams, approves level-up requests',
    authUser: {
      uid: 'mock_admin',
      email: 'dev.admin@develeap.com',
      displayName: 'Dev Admin',
      photoURL: null,
    },
    profile: {
      email: 'dev.admin@develeap.com',
      displayName: 'Dev Admin',
      photoURL: null,
      createdAt: now,
      role: 'admin',
      teamLeaderId: null,
      teamLeaderName: null,
      approvalStatus: 'approved',
      currentLevel: 10,
      joinedCompanyAt: now,
      approvedAt: now,
      plan: { items: [], selectedLevelId: 0, lastUpdated: now },
      achieved: { items: [], lastUpdated: now },
    },
  },
];

export const MOCK_USERS_MAP: Record<string, MockUser> = Object.fromEntries(
  MOCK_USERS.map((u) => [u.key, u])
);

export { MOCK_USERS };

/**
 * Resets all mock user documents to their default state in Firestore,
 * and deletes all achievements/notifications/levelUpRequests for mock UIDs.
 * Unlike seedDevData, this does a full overwrite — no merge.
 */
export async function resetDevData(): Promise<void> {
  const mockEmails = MOCK_USERS.map((u) => u.authUser.email);

  // Overwrite user documents (full reset, no merge)
  const userWrites = MOCK_USERS.map((mockUser) => {
    const ref = doc(db, 'users', mockUser.authUser.email);
    return setDoc(ref, mockUser.profile);
  });
  await Promise.all(userWrites);

  // Delete achievements, notifications, levelUpRequests for mock users
  const collectionsToClean = ['achievements', 'notifications', 'levelUpRequests'];
  for (const colName of collectionsToClean) {
    for (const email of mockEmails) {
      const q = query(collection(db, colName), where('userId', '==', email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  }

  console.log('[DevMode] Reset', MOCK_USERS.length, 'mock users to default state');
}

/** Returns true when dev mode is active */
export function isDevMode(): boolean {
  return localStorage.getItem('dcr-dev-mode') === 'true';
}

/** Returns the active mock user key (or null for guest) */
export function getActiveMockUserKey(): string | null {
  return localStorage.getItem('dcr-mock-user');
}

/** Sets the active mock user and reloads */
export function setMockUser(key: string | null): void {
  if (key === null) {
    localStorage.removeItem('dcr-mock-user');
  } else {
    localStorage.setItem('dcr-mock-user', key);
  }
  window.location.reload();
}

/** Enables or disables dev mode and reloads */
export function setDevMode(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('dcr-dev-mode', 'true');
  } else {
    localStorage.removeItem('dcr-dev-mode');
    localStorage.removeItem('dcr-mock-user');
    localStorage.removeItem('dcr-dev-date');
  }
  window.location.reload();
}

/**
 * Seeds all mock user documents into Firestore so cross-user queries work
 * (e.g. PendingApprovalPage fetching TL info, TL dashboard seeing pending employees).
 *
 * Uses merge:true so any real plan data written during the test session is preserved.
 * Safe to call repeatedly — idempotent.
 */
export async function seedDevData(): Promise<void> {
  const writes = MOCK_USERS.map((mockUser) => {
    const ref = doc(db, 'users', mockUser.authUser.email);
    // Write the profile, but don't overwrite plan data if it already exists
    const { plan: _plan, ...profileWithoutPlan } = mockUser.profile;
    return setDoc(ref, profileWithoutPlan, { merge: true });
  });
  await Promise.all(writes);
  console.log('[DevMode] Seeded', MOCK_USERS.length, 'mock users into Firestore');
}
