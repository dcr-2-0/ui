/**
 * Portal-level news and program updates shown on the Home page.
 *
 * How to update:
 *  - Add/remove items here.
 *  - `quarter` limits visibility to a specific quarter (e.g. 'Q1-2026').
 *    Omit to show across all quarters.
 *  - `isNew` adds a "NEW" pill to the card.
 *  - `type` controls the accent colour:
 *      promotion  → amber  (bonus points / featured items)
 *      deadline   → red    (time-sensitive actions)
 *      reminder   → blue   (recurring rules / good-to-know)
 *      announcement → purple (platform / program news)
 */

export type NewsType = 'promotion' | 'deadline' | 'reminder' | 'announcement';

export interface PortalNewsItem {
  id: string;
  type: NewsType;
  title: string;
  body: string;
  icon: string;
  /** If set, card is only shown while the current quarter matches this value. */
  quarter?: string;
  /** Show a "NEW" badge on the card. */
  isNew?: boolean;
  link?: { label: string; navId: string; navLabel: string };
}

export const portalNews: PortalNewsItem[] = [
  // ── Active promotions ─────────────────────────────────────────────────────
  {
    id: 'promo-gcp-q1-2026',
    type: 'promotion',
    title: 'GCP Certifications — 10% Bonus',
    body: 'All Google Cloud certifications carry a 10% bonus on top of their base point value this quarter. A great time to go for that Professional Cloud cert.',
    icon: 'ri-google-line',
    quarter: 'Q1-2026',
    isNew: true,
    link: { label: 'Browse GCP certs', navId: 'tech', navLabel: 'Tech' },
  },
  {
    id: 'promo-genai-q1-2026',
    type: 'promotion',
    title: 'AWS GenAI Developer — 500 pts',
    body: 'The new AWS Certified Generative AI Developer – Professional earns 500 promoted points (base: 400). Early movers gain a significant edge on this emerging skill.',
    icon: 'ri-sparkling-2-line',
    quarter: 'Q1-2026',
    isNew: true,
    link: { label: 'View certification', navId: 'tech', navLabel: 'Tech' },
  },

  // ── Deadlines ─────────────────────────────────────────────────────────────
  {
    id: 'deadline-circles-q1-2026',
    type: 'deadline',
    title: 'Certification Circles — Register by Jan 31',
    body: 'Study groups for certs worth 130+ points must be declared in the first month of the quarter. Use the certification-circle form to register your group and unlock the group bonus.',
    icon: 'ri-group-line',
    quarter: 'Q1-2026',
    link: { label: 'Open Forms', navId: 'forms', navLabel: 'Forms' },
  },
  {
    id: 'deadline-plan-submit-q1-2026',
    type: 'deadline',
    title: 'Q1 2026 Plan Submission',
    body: 'Submit your Q1 plan to your team leader before the end of March. Approved plans are paid out in the April salary.',
    icon: 'ri-calendar-check-line',
    quarter: 'Q1-2026',
    link: { label: 'Go to Plan', navId: 'simulator', navLabel: 'Plan' },
  },

  // ── Reminders (always visible) ────────────────────────────────────────────
  {
    id: 'reminder-weekly-reports',
    type: 'reminder',
    title: 'Weekly Reports Are Mandatory',
    body: 'Team leaders verify consistent weekly report submission at quarter end as a condition for level-up approval. Don\'t let them pile up.',
    icon: 'ri-file-text-line',
  },
  {
    id: 'reminder-carryover',
    type: 'reminder',
    title: 'Excess Points Never Expire',
    body: 'Any points above your current level threshold carry forward automatically. For example: earn 1100 pts toward a 1000 pt level and 100 pts roll into the next.',
    icon: 'ri-bank-line',
    link: { label: 'Points system', navId: 'guidelines', navLabel: 'Guidelines' },
  },
  {
    id: 'reminder-billable-hours',
    type: 'reminder',
    title: 'Billable Hours: 515 pts Max, No Rollover',
    body: 'Billable hours count from your level start date (not quarterly) and are capped at 515 points. Unlike other points, excess billable hours do not carry over.',
    icon: 'ri-time-line',
    link: { label: 'Read guidelines', navId: 'guidelines', navLabel: 'Guidelines' },
  },
  {
    id: 'reminder-miluim',
    type: 'reminder',
    title: 'Miluim? You Get Extra Time',
    body: 'Reservists receive at least one additional month to hit their point and billable-hour targets. Raise occurs in the last month of the extension. Joining a circle also adds 5% bonus to all members.',
    icon: 'ri-shield-star-line',
    link: { label: 'Read guidelines', navId: 'guidelines', navLabel: 'Guidelines' },
  },

  // ── Announcements (platform news) ─────────────────────────────────────────
  {
    id: 'announcement-dcr2-launch',
    type: 'announcement',
    title: 'DCR 2.0 Is Live',
    body: 'Plan submission, achievement tracking, team leader approvals, and quarterly history are now fully online. No more spreadsheets — submit your plan directly from the Plan page.',
    icon: 'ri-rocket-line',
    isNew: true,
    link: { label: 'Go to Plan', navId: 'simulator', navLabel: 'Plan' },
  },
  {
    id: 'announcement-roadmaps',
    type: 'announcement',
    title: 'Roadmap Badges Are Trackable',
    body: 'Add certifications to your plan and roadmap badges unlock automatically when all requirements are met. Check the Roadmaps section to see which badges you\'re close to.',
    icon: 'ri-route-line',
    link: { label: 'View Roadmaps', navId: 'roadmaps', navLabel: 'Roadmaps' },
  },
];
