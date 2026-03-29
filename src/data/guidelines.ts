export interface GuidelineSection {
  id: number;
  title: string;
  icon: string;
  points: string[];
}

export const guidelines: GuidelineSection[] = [
  {
    id: 1,
    title: 'DCR Goals & Objectives',
    icon: 'ri-focus-3-line',
    points: [
      'Continuously stretch our abilities & skills, and always be at the front',
      'Continuous Learning (CL) - stay updated with industry trends and technologies',
      'Continuously increase our market value through skill development',
      'Long-term career planning that remains dynamic and adaptable',
      'Motivation and personal growth for all consultants',
      'Support different types of consultants and various career paths',
    ],
  },
  {
    id: 2,
    title: 'General Program Rules',
    icon: 'ri-file-list-3-line',
    points: [
      'DCR is created for new employees at least 3 months after joining Develeap',
      'Achievements completed before DCR creation do not count - we plan for the future',
      'Each consultant creates an achievements backlog with their team leader',
      'Achievements can be chosen from the general backlog or new ideas are welcome',
      "Every achievement has its own 'price' (point value)",
      'All achievements must be documented and shared with Team Leader',
      'DCR work happens on personal time, not customer time (except billable hours and customer-specific achievements)',
    ],
  },
  {
    id: 3,
    title: 'Quarterly Celebration Points & Payouts',
    icon: 'ri-calendar-check-line',
    points: [
      'Q1 (January-March): Received in April salary, at the beginning of May',
      'Q2 (April-June): Received in July salary, at the beginning of August',
      'Q3 (July-September): Received in October salary, at the beginning of November',
      'Q4 (October-December): Received in January salary, at the beginning of February',
      'During celebration points, leveled-up consultants are celebrated and backlog is reset',
      'Weekly reports are now mandatory - Team Leader approves proper submission at quarter end',
    ],
  },
  {
    id: 4,
    title: 'Level Up Process & Documentation',
    icon: 'ri-arrow-up-circle-line',
    points: [
      'When you level up, you get a raise in the same quarter',
      'Review achievements with Team Leader, then sent to Group Leader for approval',
      "All achievements must have documentation links in the DCR sheet 'Document' column",
      'Certifications: Credly certification badge or official certificate',
      'Articles: Direct link to published article',
      'Code reviews: Summary email or Notion page with link',
      'Role expectations may vary between positions - discuss with Team Leader',
    ],
  },
  {
    id: 5,
    title: 'Points System & Level Requirements',
    icon: 'ri-bar-chart-box-line',
    points: [
      'Level 1-2: 850 points required for each level',
      'Level 3-4: 1000 points required for each level',
      'Level 5-6: 1200 points required for each level',
      'Level 7-8: 1500 points required for each level',
      'Level 9-10: 1700 points required for each level',
      'Excess points are saved for the next level - points are never wasted!',
      'Billable hours: Maximum 515 points, no rollover of excess hours',
      'Billable hours calculated from level start date, not quarterly',
      'Goals setting is cooperative between team member and Team Leader',
      'Goals can be modified with Team Leader approval during the level',
    ],
  },
  {
    id: 6,
    title: 'Roadmaps & Certification Badges',
    icon: 'ri-route-line',
    points: [
      'Roadmap badges awarded for achieving groups of related certifications',
      'Bonus points given when completing the final missing certification in a roadmap',
      'If you already have all certifications in a roadmap, bonus points awarded immediately',
      'Roadmaps help guide career development in specific technology areas',
    ],
  },
  {
    id: 7,
    title: 'Certification Circles',
    icon: 'ri-group-line',
    points: [
      'Study groups for certifications worth 130+ points',
      'Must declare participation in the first month of each quarter',
      'Bonus points distributed based on group size and completion percentage',
      'Special bonus: Miluimnik participants add 5% extra points to all circle members (max 2 per circle)',
      'Use the certification-circle form to announce and organize groups',
    ],
  },
  {
    id: 8,
    title: 'Miluim (Reservist) Special Conditions',
    icon: 'ri-shield-star-line',
    points: [
      'Miluimniks get additional month (minimum) to achieve points and billable hours',
      'Extension period can be longer if miluim service exceeds one month',
      'Billable hours count for both quarters during miluim period',
      'Raise occurs in the last month of extension period (any month of the year)',
      'Possibility to level up twice in the same quarter without affecting next level',
      'Miluimnik in certification-circle adds 5% bonus to all circle members',
    ],
  },
  {
    id: 9,
    title: 'Promoted Items & Bonus Points',
    icon: 'ri-megaphone-line',
    points: [
      'Some items are promoted each quarter and receive ~10% bonus points',
      'Promoted items are highlighted on the main page and in the catalog',
      'Currently: All GCP certifications offer 10% bonus points',
      'Promoted items help guide focus toward high-value learning opportunities',
    ],
  },
  {
    id: 10,
    title: 'Forms & Resources',
    icon: 'ri-links-line',
    points: [
      'Form 1: Use for suggesting new items to add to the DCR catalog',
      'Form 2: Use for submitting and announcing certification-circles',
      "All forms accessible through the 'Forms' section in the navigation menu",
      'New achievement ideas are welcome and will be reviewed for inclusion',
    ],
  },
];
