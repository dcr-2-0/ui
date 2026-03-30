import type { ProfessionalismItem } from '../types';

const DEVELEAP_IMG = 'https://s3.us-east-1.amazonaws.com/dcr-2.0/images/develeap_transparent-Photoroom.png';

export const professionalism: ProfessionalismItem[] = [
  {
    id: 'prof-billable-hours',
    name: 'Billable hours',
    points: 515,
    category: 'professionalism',
    subcategory: 'Professional Standards',
    required: true,
    image: DEVELEAP_IMG,
    description:
      "Customer hours that are billable.\n\n  Mandatory for leveling up.\n\n  Need to have at least 515 billable hours during the quarter.\n\n  Points are capped at 515 but carry over to the next quarter if you didn't level up.\n\n  For reservists (miluim), see the Guidelines section.",
  },
  {
    id: 'prof-weekly-reports',
    name: 'Weekly reports',
    points: 0,
    category: 'professionalism',
    subcategory: 'Professional Standards',
    required: true,
    image: DEVELEAP_IMG,
    description:
      'Weekly reports sent to the relevant people (team leader, group leader, customer focal points, weeklies email).\n\n Mandatory for leveling up.\n\n Team leader approves at the end of each quarter that reports were sent regularly.',
  },
  {
    id: 'prof-performance-forms',
    name: 'Weekly performance forms',
    points: 0,
    category: 'professionalism',
    subcategory: 'Professional Standards',
    required: true,
    image: DEVELEAP_IMG,
    description:
      'Weekly performance forms sent to the email each Thursday are filled regularly.\n\n Mandatory for leveling up.\n\n Team leader approves at the end of each quarter that forms were sent regularly.',
  },
  {
    id: 'prof-toggle-filling',
    name: 'Toggle regular filling',
    points: 0,
    category: 'professionalism',
    subcategory: 'Professional Standards',
    required: true,
    image: DEVELEAP_IMG,
    description:
      'Filling Toggle hours on a regular basis, without long delays or missed days.\n\n Mandatory for leveling up.\n\n Team leader approves at the end of each quarter.',
  },
];
