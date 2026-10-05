export const TREE_LAYOUT = {
  nodeWidth: 188,
  nodeHeight: 72,
  columnGap: 72,
  rowGap: 16,
  rulerOffset: 40,
  skeletonColumns: 10
} as const;

export const TREE_VIEW = {
  minZoom: 0.2,
  maxZoom: 1.6,
  fitPadding: 0.14,
  readableZoom: 0.85,
  initialMaxZoom: 1,
  edgePadding: 24,
  fitDuration: 200,
  compactQuery: '(width <= 1100px)',
  listQuery: '(width < 560px)'
} as const;

export const TREE_EDGE = {
  path: { borderRadius: 0, offset: 16 }
} as const;

export const TREE_FORMAT = {
  compact: { notation: 'compact', maximumFractionDigits: 1 }
} as const satisfies Record<string, Intl.NumberFormatOptions>;
