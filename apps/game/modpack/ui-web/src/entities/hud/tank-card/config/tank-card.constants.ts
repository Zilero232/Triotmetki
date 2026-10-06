export const TANK_CARD = {
  width: 264,
  classIcon: 16,
  spark: { width: 72, height: 26 },
  steps: [0, 65, 85, 95, 100],
  tiers: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'],
  unknownPercent: '—',
  deltaTones: { up: 'good', down: 'bad', flat: 'muted' }
} as const;
