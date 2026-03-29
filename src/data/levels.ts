export interface Level {
  id: number;
  label: string;
  points: number;
  /** IDs of mandatory items required for this level */
  mandatoryItems: string[];
  /** Minimum points required per pillar */
  pillarRequirements: {
    tech: number;
    'knowledge-unlock': number;
    collaboration: number;
  };
}

// Easy to extend: add new mandatory professionalism item IDs here
export const MANDATORY_ITEM_IDS = [
  'prof-billable-hours',
  'prof-weekly-reports',
  'prof-performance-forms',
  'prof-toggle-filling',
];

const commonPillarRequirements = {
  tech: 50,
  'knowledge-unlock': 20,
  collaboration: 30,
};

export const levels: Level[] = [
  {
    id: 1,
    label: 'Level 1',
    points: 850,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 2,
    label: 'Level 2',
    points: 850,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 3,
    label: 'Level 3',
    points: 1000,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 4,
    label: 'Level 4',
    points: 1000,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 5,
    label: 'Level 5',
    points: 1200,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 6,
    label: 'Level 6',
    points: 1200,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 7,
    label: 'Level 7',
    points: 1500,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 8,
    label: 'Level 8',
    points: 1500,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 9,
    label: 'Level 9',
    points: 1700,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
  {
    id: 10,
    label: 'Level 10',
    points: 1700,
    mandatoryItems: MANDATORY_ITEM_IDS,
    pillarRequirements: commonPillarRequirements,
  },
];
