export const HIT_VIEWER = {
  sides: ['received', 'dealt'],
  tones: ['pen', 'crit', 'blocked', 'ricochet', 'nodamage'],
  columns: ['number', 'vehicle', 'result', 'shell', 'angle', 'armor', 'damage'],
  marker: { dot: 14, selectedDot: 22, line: 2 },
  degreesPerRadian: 180 / Math.PI,
  zoomStep: 200,
  dash: '—',
  table: { rowPx: 32, maxRows: 12 },
  keys: { previous: ['ArrowLeft', 'ArrowUp'], next: ['ArrowRight', 'ArrowDown'], tab: 'Tab' }
} as const;
