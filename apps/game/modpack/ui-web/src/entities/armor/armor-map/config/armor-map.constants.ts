export const ARMOR_MAP = {
  modes: ['nominal', 'effective', 'shell'],
  alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_',
  patternStep: 16,
  pattern: { none: 0, screen: 1, track: 2 },
  hatchPeriod: 3,
  empty: 0
} as const;

export const ARMOR_PALETTE = {
  thickness: ['#4fbf6a', '#7fc456', '#a9c84a', '#cfc742', '#e3b53b', '#e89a37', '#e67d35', '#e05f33', '#d2452f', '#b8362a', '#982a24', '#74201d'],
  shell: ['#3fae5c', '#8fbf3f', '#c9c23a', '#e0b43a', '#e08a3a', '#d8663a', '#d2452f', '#8c2a1f'],
  fixed: { 13: '#8467cf', 14: '#5c7486', 15: '#3a3f44' },
  hatch: { 1: 'rgba(255, 255, 255, 0.5)', 2: 'rgba(0, 0, 0, 0.55)' },
  swatch: '#6b7178'
} as const;

export const FIXED_TONE_COLORS: Readonly<Partial<Record<number, string>>> = ARMOR_PALETTE.fixed;

export const HATCH_COLORS: Readonly<Partial<Record<number, string>>> = ARMOR_PALETTE.hatch;
