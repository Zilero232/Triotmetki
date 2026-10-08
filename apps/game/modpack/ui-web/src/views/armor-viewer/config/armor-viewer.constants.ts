export const ARMOR_VIEWER = {
  properties: { state: 'state', map: 'map', hover: 'hover', status: 'status', escape: 'escape' },
  hover: { offset: 18, digits: 4, flipShare: 0.7 },
  distanceStep: 10,
  tiers: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'],
  placeholder: /\{(\w+)\}/g
} as const;
