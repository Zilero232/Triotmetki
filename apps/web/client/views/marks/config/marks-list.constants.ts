import { minutesToMilliseconds } from 'date-fns';

export const MOE_LIST = {
  pageLimit: 100,
  historyStaleMs: minutesToMilliseconds(10),
  historyChartHeight: 200,
  rowHeight: 44,
  pinWidth: 40,
  datePlaceholder: ' '.repeat(12),
  skeletonRows: 20
} as const;

export const PLAYER_LOOKUP = {
  debounceMs: 300,
  suggestions: 5,
  closestLimit: 8,
  skeletonRows: [0, 1, 2, 3]
} as const;

export const MARKS_HEAD = {
  updatedSkeleton: { height: 24, width: 96 }
} as const;

export const MARKS_BODY_SKELETON = {
  bandHeight: 260,
  toolbarHeight: 56,
  tableHeight: 640
} as const;
