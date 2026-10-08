import type { RatingPeriod } from '@otmetki/schemas';

export const PROFILE_TABS = ['overview', 'tanks', 'sessions', 'marks', 'achievements', 'modes', 'charts', 'insights', 'history'] as const;

export const PROFILE_PERIODS = ['overall', '1000', '30d', '7d', '24h'] as const satisfies readonly RatingPeriod[];

export const PROFILE_VIEW = {
  tabParam: 'tab',
  defaultPeriod: 'overall'
} as const satisfies { tabParam: string; defaultPeriod: RatingPeriod };

export const SESSIONS = {
  pageSize: 20,
  skeletonHeight: 480,
  stackedQuery: '(width < 900px)'
} as const;

export const PROFILE_SKELETON = {
  panels: 4,
  tabsHeight: 36,
  panelHeight: 240
} as const;

export const FIGURE_FORMAT = {
  integer: { maximumFractionDigits: 0 },
  percent: { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  decimal: { maximumFractionDigits: 1 }
} as const satisfies Record<string, Intl.NumberFormatOptions>;

export const PROFILE_HEADER = {
  seasons: 4,
  heroTanks: 3,
  wn8Ring: { size: 104, thickness: 6 }
} as const;
