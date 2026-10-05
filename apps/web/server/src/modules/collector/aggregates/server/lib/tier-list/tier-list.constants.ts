export const TIER_LIST = {
  minBattles: 500,
  bands: [
    { rank: 'S', upTo: 0.1 },
    { rank: 'A', upTo: 0.3 },
    { rank: 'B', upTo: 0.7 },
    { rank: 'C', upTo: 0.9 },
    { rank: 'D', upTo: 1 }
  ]
} as const;
