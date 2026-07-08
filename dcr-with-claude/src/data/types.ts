export interface CatalogItem {
  id: string;
  name: string;
  image?: string;
  points: number;
  category: string;
  subcategory?: string;
  required?: boolean;
  promoted?: boolean;
  /** Bonus points for promoted items (displayed as strikethrough original + new total) */
  promotedPoints?: number;
  description?: string;
  links?: { label: string; url: string }[];
  /** If true, can be added multiple times to the cart (e.g. lectures, case studies) */
  repeatable?: boolean;
  /** Curated tags for filtering (skill + provider topics) */
  tags?: string[];
  /** Unique key assigned per cart occurrence (for repeatable items). Used as proof/completion key. */
  planItemKey?: string;
}

export interface CertificationItem extends CatalogItem {
  category: 'tech';
  provider: string;
  level: 'foundational' | 'associate' | 'professional' | 'specialty';
  examCode?: string;
  examUrl?: string;
  price?: number;           // USD
  duration?: string;        // e.g. '90 min', '2 hours'
  questions?: number;       // number of exam questions
  questionType?: string;    // e.g. 'Multiple choice', 'Performance-based', 'Multiple choice + Labs'
  passingScore?: string;    // e.g. '700/1000', '70%'
  proctored?: boolean;      // whether the exam requires a live proctor
  validity?: string;        // certification validity period, e.g. '3 years', 'No expiry'
  prerequisites?: string;   // recommended experience or prior certs
  retakePolicy?: string;    // e.g. '14-day waiting period'
}

export interface ProfessionalismItem extends CatalogItem {
  category: 'professionalism';
  required: true;
}

export interface RoadmapCert {
  id: string;
  name: string;
  points: number;
  image?: string;
  choiceGroup?: string; // certs sharing the same choiceGroup are alternatives — pick one
}

export interface RoadmapItem extends CatalogItem {
  category: 'roadmaps';
  requiredCerts?: RoadmapCert[];
}

// ==========================================
// User & Profile Types (Phase 1)
// ==========================================

export type UserRole = 'employee' | 'team_leader' | 'admin';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PendingApprovalType = 'initial' | 'quarterly';

export type PlanStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type CompletionStatus = 'in_progress' | 'pending_review' | 'admin_pending' | 'level_up_approved' | 'level_up_rejected';

// ==========================================
// Proof of Completion Types
// ==========================================

export type ProofType = 'url' | 'note' | 'file';

export interface ProofEntry {
  id: string;            // crypto.randomUUID()
  type: ProofType;
  createdAt: string;     // ISO timestamp
  url?: string;          // for type === 'url'
  note?: string;         // for type === 'note' (max 1000 chars)
  fileName?: string;     // for type === 'file'
  fileUrl?: string;      // Firebase Storage download URL
  filePath?: string;     // Storage path for deletion
  fileMimeType?: string;
  fileSizeBytes?: number;
}

export interface UserPlan {
  items: CatalogItem[];
  selectedLevelId: number;
  lastUpdated: string;
  planStatus?: PlanStatus;
  planSubmittedAt?: string;
  planRejectionReason?: string;
  /** Quarter this plan was submitted in, e.g. 'Q1-2026'. Written on submitPlan(). */
  quarter?: string;
  /** Proof entries keyed by item.id — all occurrences of a repeatable item share one bucket */
  proofEntries?: Record<string, ProofEntry[]>;
  /** Set during approval: the level achieved, or null if no level-up occurred */
  levelAchievedOnApproval?: number | null;

  // Completion review (Phase 2): tracks per-item completion after plan is approved
  /** Keys of completed items in format "${itemId}-${idx}" (per-instance for repeatables) */
  completedItemKeys?: string[];
  completionStatus?: CompletionStatus;
  completionSubmittedAt?: string;
  completionRejectionReason?: string;

  // Quarter-end carryover: items the employee marked done in the previous quarter (no level-up)
  /** Items completed in the previous quarter, locked in this quarter's plan */
  carriedItems?: CatalogItem[];
  /** The quarter these carried items came from, e.g. 'Q1-2026' */
  carriedFromQuarter?: string;
  /** Points carried over from a previous level (surplus or preSystemPoints), saved at submit time */
  carryOverPoints?: number;
}

export interface AchievedItem {
  itemId: string;
  item: CatalogItem;
  completionDate: string;
  proofLink: string;
  notes?: string;
  status: 'pending' | 'approved'; // pending = waiting for TL approval, approved = TL confirmed
}

export interface UserAchieved {
  items: AchievedItem[];
  lastUpdated: string;
}

// ==========================================
// Plan History Types (Phase B)
// ==========================================

export interface PlanHistoryEntry {
  quarter: string;           // e.g. 'Q1-2025'
  items: CatalogItem[];      // snapshot of plan items at submission time
  selectedLevelId: number;
  totalPoints: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;       // ISO timestamp
  resolvedAt?: string;       // ISO timestamp when TL approved/rejected
  rejectionReason?: string;
  levelAchieved?: number;    // set when approved and user leveled up
  completedItemKeys?: string[]; // keys of items marked done during completion review
}

export interface LevelHistoryEntry {
  level: number;             // the level achieved
  date: string;              // ISO timestamp of approval
  quarter: string | null;    // 'Q1-2025' or null for initial approval
}

export interface UserDocument {
  // Basic profile
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;

  // Role & team management
  role: UserRole;
  teamLeaderId: string | null; // UID of team leader (null for team leaders/admins)
  teamLeaderName?: string | null; // Denormalized name for display (employees only)
  approvalStatus: ApprovalStatus; // Team membership status
  pendingApprovalType?: PendingApprovalType; // Set when approvalStatus === 'pending'
  currentLevel: number | null; // 1-10 (null until approved by team leader)

  // Dates
  joinedCompanyAt: string | null; // Set by team leader on approval
  approvedAt: string | null; // When team leader approved this member

  // Level-up history (Phase B): written on each TL approval
  levelHistory?: LevelHistoryEntry[];

  // Legacy plan (keep for backward compatibility with simulator)
  plan: UserPlan;

  // Items the employee already achieved before joining DCR
  achieved?: UserAchieved;

  /** Surplus points carried in from before Q1 2026 (entered during profile setup) */
  preSystemPoints?: number;
}

// ==========================================
// Level-Up Request Types (admin approval flow)
// ==========================================

export interface LevelUpRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userPhotoURL: string | null;
  teamLeaderId: string;
  teamLeaderName: string;
  teamLeaderEmail: string;
  levelFrom: number;
  levelTo: number;
  quarter: string;            // e.g. 'Q1-2026'
  completedItemKeys: string[];
  planItems: CatalogItem[];   // snapshot of plan at submission
  proofEntries?: Record<string, ProofEntry[]>;  // snapshot of proofs at submission
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;        // when TL recommended
  resolvedAt?: string;        // when admin decided
  resolvedBy?: string;        // admin uid
  rejectionReason?: string;
}

// ==========================================
// Notification Types
// ==========================================

export type NotificationType = 'level_up_approved' | 'level_up_rejected' | 'level_up_recommended';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: {
    levelFrom?: number;
    levelTo?: number;
    quarter?: string;
    employeeName?: string;
    requestId?: string;
  };
}

// ==========================================
// Email Queue Types (for HR email via Firebase Extension)
// ==========================================

export interface EmailQueueItem {
  to: string;
  subject: string;
  html: string;
  createdAt: string;
  status: 'pending';
}

// ==========================================
// Comment Types
// ==========================================

export interface ItemComment {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Achievement Types (Phase 1)
// ==========================================

export type AchievementStatus = 'historical' | 'planned' | 'submitted' | 'approved' | 'rejected';

export type AchievementType = 'historical' | 'quarterly';

export interface Achievement {
  id: string; // Auto-generated Firestore ID
  userId: string; // UID of employee who earned it
  itemId: string; // Reference to catalog item (e.g., 'tech-aws-cloud-practitioner')
  item: CatalogItem; // Denormalized copy for historical accuracy
  /** Phase B: set when a TL-approved plan consumes this achievement for a level-up */
  usedForLevelId?: number;

  // Status tracking
  status: AchievementStatus;
  type: AchievementType; // historical = before DCR, quarterly = DCR program

  // Dates
  completionDate: string; // ISO timestamp when actually completed
  quarter: string | null; // 'Q1-2026', 'Q2-2025', etc (null for historical)

  // Proof & documentation
  proofLink: string; // URL to Credly, article, code review doc, etc
  notes: string; // Optional notes

  // Approval workflow (for quarterly achievements)
  submittedAt: string | null; // When status changed to 'submitted'
  approvedAt: string | null; // When status changed to 'approved'
  approvedBy: string | null; // UID of team leader/admin who approved
  rejectionReason: string | null; // If status = 'rejected'

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// App Config Types (Quarter Freeze)
// ==========================================

export interface AppConfigDocument {
  /** When set: all users see this as the active quarter. When null: calendar-driven. */
  activeQuarter: string | null;
}