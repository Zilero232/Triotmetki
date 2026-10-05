import type { TankReference } from '@otmetki/schemas';

import type { ReferenceRow } from './tank-reference.types';

import { percentOf } from '../../../common/lib';

export const toTankReference = (row: ReferenceRow): TankReference => {
  const per = (value: number): number | null => (row.battles > 0 ? value / row.battles : null);

  return {
    battles: row.battles,
    winRate: percentOf({ value: row.wins, by: row.battles }),
    avgDamage: per(row.damage),
    avgAssisted: per(row.assisted),
    avgSpotted: per(row.spotted),
    avgFrags: per(row.frags),
    avgBlocked: per(row.blocked)
  };
};
