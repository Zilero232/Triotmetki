import type { TankServerStatsRow } from '@otmetki/schemas';

import type { CsvCell } from '@/shared/lib/data-file';

export const tanksCsvRows = (rows: readonly TankServerStatsRow[]): Record<string, CsvCell>[] =>
  rows.map(({ vehicle, battles, players, winRate, winRateDiff, avgDamage, avgFrags, avgSpotted, avgXp, avgBlocked, survivalRate, accuracy }) => ({
    tank: vehicle.name,
    slug: vehicle.slug,
    tier: vehicle.tier,
    type: vehicle.type,
    nation: vehicle.nation,
    battles,
    players,
    winRate,
    winRateDiff,
    avgDamage,
    avgFrags,
    avgSpotted,
    avgXp,
    avgBlocked,
    survivalRate,
    accuracy
  }));
