export const HIT_VIEWER = {
  sides: ['received', 'dealt'],
  profileSide: 'received',
  tones: ['pen', 'crit', 'blocked', 'ricochet', 'nodamage'],
  results: ['win', 'loss', 'draw'],
  columns: ['number', 'vehicle', 'result', 'zone', 'shell', 'angle', 'armor', 'damage'],
  zoomStep: 200,
  dash: '—',
  table: { rowHeight: 34 },
  picker: { rowHeight: 68, maxRows: 6 },
  frame: { design: { width: 1920, height: 1035 }, minScale: 1, maxScale: 2, lobbyBar: 45 },
  keys: { previous: ['ArrowLeft', 'ArrowUp'], next: ['ArrowRight', 'ArrowDown'], tab: 'Tab' }
} as const;
