export const HUD_OVERLAY = {
  hoverPollMs: 50,
  measureFrames: 4,
  scaleOrigin: '0 0',
  hidden: 0,
  emptyRect: { left: 0, top: 0, width: 0, height: 0 },
  noInputRect: { left: 0, top: 0, width: 1, height: 1 },
  inputAreaRefreshMs: 1000,
  dock: { gap: 6, reserve: 190, ceiling: 80 },
  hintGap: 6,
  attach: {
    gap: 12,
    edge: 8,
    bar: { height: 58, keys: 6, above: 6, split: 6, row: 52 },
    minimap: { gap: 12 },
    score: { offset: 308, top: 4, narrow: 1700, under: 52 }
  },
  postmortemTips: { width: 501, height: 72 },
  coverAlpha: { stats: 0.25, modal: 0.25 }
} as const;
