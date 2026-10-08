export const MOD_FAIR_PLAY = {
  reads: ['results', 'dossier', 'feedback', 'queue', 'loadout', 'accounts'],
  never: ['enemies', 'reload', 'aim', 'allies', 'stats', 'others'],
  bans: {
    total: 50_882,
    tiers: [
      { id: 'week', count: 33_141 },
      { id: 'month', count: 13_674 },
      { id: 'forever', count: 4067 }
    ]
  }
} as const;
