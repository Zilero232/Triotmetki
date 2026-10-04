export const HIT_VIEWER = {
  sides: ['received', 'dealt'],
  tones: ['pen', 'crit', 'blocked', 'ricochet', 'nodamage'],
  columns: ['number', 'vehicle', 'result', 'shell', 'damage', 'angle', 'armor'],
  marker: { dot: 14, selectedDot: 22, line: 2 },
  degreesPerRadian: 180 / Math.PI,
  inputCheckMs: 250
} as const;
