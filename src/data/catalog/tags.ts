export interface CatalogTag {
  id: string;
  label: string;
  icon: string;   // Remix Icon class name
  color: string;  // 6-digit hex, used for icon tinting and active state
}

export const SKILL_TAGS: CatalogTag[] = [
  { id: 'cloud',      label: 'Cloud',      icon: 'ri-cloud-line',              color: '#0ea5e9' },
  { id: 'ci-cd',      label: 'CI/CD',      icon: 'ri-git-merge-line',          color: '#f97316' },
  { id: 'gitops',     label: 'GitOps',     icon: 'ri-git-branch-line',         color: '#14b8a6' },
  { id: 'security',   label: 'Security',   icon: 'ri-shield-check-line',       color: '#ef4444' },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'ri-settings-4-line',         color: '#3b82f6' },
  { id: 'iac',        label: 'IaC',        icon: 'ri-code-s-slash-line',       color: '#8b5cf6' },
  { id: 'data',       label: 'Data',       icon: 'ri-database-2-line',         color: '#f59e0b' },
  { id: 'ai-ml',      label: 'AI / ML',    icon: 'ri-robot-line',              color: '#ec4899' },
  { id: 'finops',     label: 'FinOps',     icon: 'ri-coin-line',               color: '#22c55e' },
  { id: 'networking', label: 'Networking', icon: 'ri-global-line',             color: '#06b6d4' },
  { id: 'developer',  label: 'Developer',  icon: 'ri-terminal-box-line',       color: '#6366f1' },
];

export const PROVIDER_TAGS: CatalogTag[] = [
  { id: 'aws',       label: 'AWS',       icon: 'ri-cloud-fill',      color: '#ff9900' },
  { id: 'azure',     label: 'Azure',     icon: 'ri-windows-fill',    color: '#0078d4' },
  { id: 'gcp',       label: 'GCP',       icon: 'ri-google-fill',     color: '#4285f4' },
  { id: 'github',    label: 'GitHub',    icon: 'ri-github-fill',     color: '#6e40c9' },
  { id: 'hashicorp', label: 'HashiCorp', icon: 'ri-lock-fill',       color: '#7b42bc' },
];
