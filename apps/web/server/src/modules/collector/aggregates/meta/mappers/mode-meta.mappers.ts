import type { Prisma } from '../../../../../../generated';
import type { ToModeRecordInput } from './mode-meta.types';

import { clampPercent, winRatePercent } from '../../../../../common/lib';

const finiteOrNull = (value: number | null): number | null => (value === null || !Number.isFinite(value) ? null : value);

export const toModeRecord = ({ row, mode, windowDays, computedAt }: ToModeRecordInput): Prisma.ModeTankAggregateCreateManyInput => ({
  tankId: row.tank_id,
  mode,
  battles: row.battles,
  players: row.players,
  wins: row.wins,
  decided: row.decided,
  winRate: winRatePercent({ wins: row.wins, battles: row.decided }),
  avgDamage: finiteOrNull(row.avg_damage),
  avgXp: finiteOrNull(row.avg_xp),
  avgFrags: finiteOrNull(row.avg_frags),
  survivalRate: clampPercent(finiteOrNull(row.survival_rate)),
  modBattles: row.mod_battles,
  replayBattles: row.replay_battles,
  windowDays,
  computedAt
});
