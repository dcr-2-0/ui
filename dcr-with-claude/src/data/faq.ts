export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export const faq: FaqItem[] = [
  {
    id: 1,
    question: 'When can I start the DCR program?',
    answer:
      'You can start the DCR program at least 3 months after joining Develeap. This waiting period allows you to settle in and understand the company culture before focusing on career development planning.',
  },
  {
    id: 2,
    question: 'Do achievements I completed before starting DCR count?',
    answer:
      'No, achievements completed before DCR creation do not count. The DCR program is designed for future planning and growth. We focus on setting goals and achieving them moving forward, not rewarding past accomplishments.',
  },
  {
    id: 3,
    question: 'How many points do I need to level up?',
    answer:
      'Point requirements are structured by level tiers: Level 1-2 requires 850 points each, Level 3-4 requires 1000 points each, Level 5-6 requires 1200 points each, Level 7-8 requires 1500 points each, and Level 9-10 requires 1700 points each. Remember that excess points carry forward to your next level!',
  },
  {
    id: 4,
    question: 'When do I get paid for leveling up?',
    answer:
      'Raises are paid in the same quarter you level up. The quarterly schedule is: Q1 (Jan-Mar) paid in April salary, Q2 (Apr-Jun) paid in July salary, Q3 (Jul-Sep) paid in October salary, Q4 (Oct-Dec) paid in January salary.',
  },
  {
    id: 5,
    question: 'What happens to extra points if I exceed my level requirement?',
    answer:
      "Great news - excess points are never wasted! For example, if you're at Level 3 (needing 1000 points) and achieve 1100 points, the extra 100 points are saved for Level 4. However, billable hours are capped at 515 points maximum with no rollover of excess hours.",
  },
  {
    id: 6,
    question: 'Can I work on DCR achievements during customer time?',
    answer:
      'No, DCR work should happen on personal time, not customer time. The exceptions are billable hours (which obviously happen during customer work) and customer-specific achievements like peer code reviews that naturally occur during client projects.',
  },
  {
    id: 7,
    question: 'What documentation do I need for achievements?',
    answer:
      "All achievements require documentation in the DCR sheet 'Document' column. Examples: Certifications need Credly badges or official certificates, articles need direct links, code reviews need summary emails or Notion pages with links.",
  },
  {
    id: 8,
    question: 'What are certification circles and how do they work?',
    answer:
      'Certification circles are study groups for certifications worth 130+ points. You must declare participation in the first month of each quarter. Bonus points are distributed based on group size and completion rates. Use the certification-circle form to organize groups.',
  },
  {
    id: 9,
    question: "I'm doing miluim (military reserves) - are there special rules?",
    answer:
      'Yes! Miluimniks get at least one additional month to achieve points and billable hours. Your billable hours count for both quarters, and you can potentially level up twice in the same quarter. In certification circles, you add 5% extra points for all members.',
  },
  {
    id: 10,
    question: 'What are roadmap badges and how do I earn them?',
    answer:
      'Roadmap badges are bonus points awarded for completing groups of related certifications (like AWS or Azure certification paths). You get the bonus when you complete the final missing certification in a roadmap, or immediately if you already have all required certs.',
  },
  {
    id: 11,
    question: 'Can I change my achievement goals during a level?',
    answer:
      'Yes, goals setting is cooperative between you and your team leader. You can modify your goals with team leader approval during the level. The process is designed to be flexible and adapt to changing circumstances.',
  },
  {
    id: 12,
    question: 'Are weekly reports really mandatory now?',
    answer:
      'Yes, weekly reports are now mandatory for leveling up. Your team leader will approve at the end of each quarter that reports were sent consistently. This helps maintain communication and track progress throughout your DCR journey.',
  },
  {
    id: 13,
    question: 'What are promoted items and how do I know about them?',
    answer:
      'Some items receive ~10% bonus points each quarter and are highlighted on the main page and catalog. Currently, all GCP certifications offer 10% bonus points. Check the main page regularly for current promotions.',
  },
  {
    id: 14,
    question: 'How are billable hours calculated?',
    answer:
      "Billable hours are calculated from your level start date, not quarterly. You need a minimum of 515 hours per level (not per quarter), which counts toward your total points requirement (850-1700 depending on your target level). For example, if you leveled up April 1st and reach 515 hours by September end, you can still level up as it's calculated across the entire level period.",
  },
  {
    id: 15,
    question: 'Who approves my level up?',
    answer:
      'First, review your achievements with your Team Leader and plan your next achievements. After TL review, it gets sent to the Group Leader for final approval. Both mandatory items (billable hours and weekly reports) must be completed.',
  },
  {
    id: 16,
    question: 'How should I plan my points strategy for different levels?',
    answer:
      'Start by knowing your target level requirements: Early levels (1-2) need 850 points, Mid levels (3-4) need 1000 points, Advanced levels (5-6) need 1200 points, Expert levels (7-8) need 1500 points, and Master levels (9-10) need 1700 points. Remember that 515 points come from mandatory billable hours, so plan additional achievements accordingly. Use the Level-up Simulator to test different combinations!',
  },
];
