export const MARKS_PANEL = {
  markSize: 20,
  fallbackMark: 'otmetki:target',
  checkGlyph: 'check',
  checkSize: 11,
  arrow: '→',
  approx: '≈',
  separator: ' / ',
  deltaTones: { rising: 'good', falling: 'bad', flat: 'muted' },
  directions: { rising: 'up', falling: 'down', flat: 'flat' },
  unknownPercent: '—',
  levels: [65, 85, 95],
  shiftSpan: 0.5,
  box: { width: 230, scale: 214 },
  large: { width: 264, silhouette: 248, scale: 248 }
} as const;
