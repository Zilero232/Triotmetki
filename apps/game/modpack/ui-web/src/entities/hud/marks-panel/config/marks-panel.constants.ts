export const MARKS_PANEL = {
  styles: ['compact', 'extended', 'minimal', 'custom'],
  markSize: 20,
  fallbackMark: 'otmetki:target',
  checkGlyph: 'check',
  checkSize: 11,
  approx: '≈',
  separator: ' / ',
  deltaTones: { rising: 'good', falling: 'bad', flat: 'muted' },
  directions: { rising: 'up', falling: 'down', flat: 'flat' },
  levels: [65, 85, 95],
  box: { width: 230, scale: 214 },
  steps: { percent: 0.01, damage: 1 }
} as const;
