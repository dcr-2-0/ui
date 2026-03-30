export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface NavSubsection {
  title: string;
  items: NavItem[];
}

interface NavSection {
  title: string;
  items?: NavItem[];
  subsections?: NavSubsection[];
}

export const navigation: NavSection[] = [
  {
    title: 'Personal Zone',
    items: [
      { id: 'home', label: 'Home', icon: 'ri-home-4-line' },
      { id: 'simulator', label: 'My Plan', icon: 'ri-calendar-todo-line' },
      { id: 'my-profile', label: 'My Profile', icon: 'ri-user-3-line' },
    ],
  },
  {
    title: 'Team',
    items: [
      { id: 'team-dashboard', label: 'My Team', icon: 'ri-team-line' },
    ],
  },
  {
    title: 'Catalog',
    subsections: [
      {
        title: 'Pillars',
        items: [
          { id: 'professionalism', label: 'Professionalism', icon: 'ri-shield-check-line' },
          { id: 'tech', label: 'Tech', icon: 'ri-computer-line' },
          { id: 'knowledge-unlock', label: 'Knowledge Unlock', icon: 'ri-edit-line' },
          { id: 'collaboration', label: 'Collaboration', icon: 'ri-hearts-line' },
        ],
      },
      {
        title: 'Badges',
        items: [
          { id: 'roadmaps', label: 'Roadmaps', icon: 'ri-route-line' },
        ],
      },
      {
        title: 'Extra',
        items: [
          { id: 'extra', label: 'Extra', icon: 'ri-star-line' },
        ],
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      { id: 'guidelines', label: 'Guidelines', icon: 'ri-book-open-line' },
      { id: 'faq', label: 'FAQ', icon: 'ri-questionnaire-line' },
      { id: 'forms', label: 'Forms', icon: 'ri-file-list-line' },
    ],
  },
];

/** Flattened list of all navigable items */
export function getAllNavItems(): NavItem[] {
  const items: NavItem[] = [];
  for (const section of navigation) {
    if (section.items) items.push(...section.items);
    if (section.subsections) {
      for (const sub of section.subsections) {
        items.push(...sub.items);
      }
    }
  }
  return items;
}
