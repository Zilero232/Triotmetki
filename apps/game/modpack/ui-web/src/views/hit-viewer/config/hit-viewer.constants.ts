export const HIT_VIEWER = {
  sides: ['received', 'dealt'],
  tones: ['pen', 'crit', 'blocked', 'ricochet', 'nodamage'],
  columns: ['number', 'vehicle', 'result', 'shell', 'angle', 'armor', 'damage'],
  zoomStep: 200,
  dash: '—',
  table: { rowHeight: 32 },
  frame: { design: { width: 1920, height: 1080 }, minScale: 1, maxScale: 2 },
  keys: { previous: ['ArrowLeft', 'ArrowUp'], next: ['ArrowRight', 'ArrowDown'], tab: 'Tab' }
} as const;
