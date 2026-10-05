import type { TankTrendPoint } from '@otmetki/schemas';

import type { TrendRow } from '../../tanks.types';

import { percentOf, ratio } from '../../../../common/lib';

export const toTrendPoints = (rows: readonly TrendRow[]): TankTrendPoint[] =>
  rows.map((row) => {
    const battles = Math.max(0, Math.round(row.battles));
    const avgDamage = ratio({ value: row.damage, by: battles });

    return {
      date: row.day,
      battles,
      players: row.players === null ? null : Math.max(0, Math.round(row.players)),
      winRate: percentOf({ value: row.wins, by: battles }),
      avgDamage: avgDamage === null ? null : Math.max(0, avgDamage)
    };
  });
