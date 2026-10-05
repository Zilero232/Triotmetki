export const EDITOR = {
  otherGroup: 'other',
  advancedGroup: 'advanced',
  zoomLevels: [1, 2],
  backdrops: ['forest', 'snow'],
  thumbSize: 40,
  emptyIconSize: 22,
  fallbackIcon: 40,
  row: { width: 316, compactWidth: 256, indent: 16 },
  chip: { charWidth: 7, padding: 22, minWidth: 32, margin: 6 },
  swatch: { size: 32, gap: 6, inlineMax: 6 },
  tile: { size: 60, gap: 6 },
  focusFrames: 4,
  focusMargin: 8
} as const;

export const CARD_THUMB = {
  minScale: 0.3,
  fallbackIcon: 24
} as const;
