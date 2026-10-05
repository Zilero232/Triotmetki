export const TANKS_TABLE = {
  numeric: { align: 'end', isNumeric: true },
  secondary: { align: 'end', isNumeric: true, hideBelow: 'md' },
  rankWidth: 48,
  pinWidth: 40,
  tankWidth: '28%',
  optionalColumns: ['tier', 'winRateDiff', 'avgFrags', 'avgSpotted', 'survivalRate', 'players', 'avgXp', 'avgBlocked', 'accuracy'],
  columnLabels: {
    tier: 'tier',
    winRateDiff: 'winRateDiff',
    avgFrags: 'frags',
    avgSpotted: 'spotted',
    survivalRate: 'survival',
    players: 'players',
    avgXp: 'avgXp',
    avgBlocked: 'avgBlocked',
    accuracy: 'accuracy'
  },
  hiddenByDefault: ['players', 'avgXp', 'avgBlocked', 'accuracy'],
  csvName: 'tanks.csv'
} as const;
