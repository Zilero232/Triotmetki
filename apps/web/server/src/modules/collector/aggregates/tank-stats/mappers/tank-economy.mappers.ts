import type { Prisma } from '../../../../../../generated';
import type { ToEconomyRecordInput, ToLearningRecordInput } from './tank-economy.types';

const roundOrNull = (value: number | null): number | null => (value === null || !Number.isFinite(value) ? null : Math.round(value));

export const toEconomyRecord = ({ row, windowDays, computedAt }: ToEconomyRecordInput): Prisma.TankEconomyAggregateCreateManyInput => {
  const hasCosts = row.cost_battles > 0;

  return {
    tankId: row.tank_id,
    account: row.account,
    battles: row.battles,
    players: row.players,
    costBattles: row.cost_battles,
    credits: roundOrNull(row.credits),
    creditsBase: roundOrNull(row.credits_base),
    repair: hasCosts ? roundOrNull(row.repair) : null,
    ammo: hasCosts ? roundOrNull(row.ammo) : null,
    consumables: hasCosts ? roundOrNull(row.consumables) : null,
    net: hasCosts ? roundOrNull(row.net) : null,
    xp: roundOrNull(row.xp),
    freeXp: roundOrNull(row.free_xp),
    windowDays,
    computedAt
  };
};

export const toLearningRecord = ({ row, windowDays, computedAt }: ToLearningRecordInput): Prisma.TankLearningCurveCreateManyInput => ({
  tankId: row.tank_id,
  bucket: row.bucket,
  battles: row.battles,
  players: row.players,
  wins: Math.min(row.wins, row.battles),
  damage: BigInt(row.damage),
  windowDays,
  computedAt
});
