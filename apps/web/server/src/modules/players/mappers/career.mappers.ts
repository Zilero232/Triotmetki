import type { CareerModeLine, CareerModeTank, PlayerAssist } from '@otmetki/schemas';

import type { BattleStatsBlock } from '../../../lib/lesta';
import type { CareerSource } from '../../collector';
import type { CareerRecordRef, CareerTotals, StoredModeTotals, ToCareerModeLineInput, ToCareerModeTankInput } from './career.types';

import { percentOf, ratio, toIso } from '../../../common/lib';
import { CAREER_MODE_FROM_DB } from '../../collector';

export const careerTotalsFromStored = (row: StoredModeTotals): CareerTotals => ({
  battles: row.battles,
  wins: row.wins,
  damageDealt: Number(row.damageDealt),
  xp: Number(row.xp),
  frags: row.frags,
  survived: row.survived,
  maxDamage: row.maxDamage,
  updatedAt: row.updatedAt
});

export const careerTotalsFromBlock = (block: BattleStatsBlock): CareerTotals => ({
  battles: block.battles,
  wins: block.wins,
  damageDealt: block.damage_dealt,
  xp: block.xp,
  frags: block.frags,
  survived: block.survived_battles,
  maxDamage: block.max_damage ?? null,
  updatedAt: null
});

export const toCareerModeLine = ({ mode, totals, tanks }: ToCareerModeLineInput): CareerModeLine => ({
  mode: CAREER_MODE_FROM_DB[mode],
  battles: totals.battles,
  winRate: percentOf({ value: totals.wins, by: totals.battles }),
  avgDamage: ratio({ value: totals.damageDealt, by: totals.battles }),
  avgXp: ratio({ value: totals.xp, by: totals.battles }),
  avgFrags: ratio({ value: totals.frags, by: totals.battles }),
  survivalRate: percentOf({ value: totals.survived, by: totals.battles }),
  maxDamage: totals.maxDamage !== null && totals.maxDamage > 0 ? totals.maxDamage : null,
  updatedAt: toIso(totals.updatedAt),
  tanks
});

export const toCareerModeTank = ({ vehicle, row }: ToCareerModeTankInput): CareerModeTank => ({
  vehicle,
  battles: row.battles,
  winRate: percentOf({ value: row.wins, by: row.battles }),
  avgDamage: ratio({ value: row.damageDealt, by: row.battles })
});

export const toPlayerAssist = (source: CareerSource): PlayerAssist | null => {
  const assist = {
    avgAssisted: source.avgDamageAssisted,
    avgRadio: source.avgDamageAssistedRadio,
    avgTrack: source.avgDamageAssistedTrack,
    avgStun: source.avgDamageAssistedStun
  };

  return Object.values(assist).every((value) => value === null) ? null : assist;
};

export const careerRecordRefs = (source: CareerSource): CareerRecordRef[] =>
  [
    { key: 'maxDamage' as const, value: source.maxDamage, tankId: source.maxDamageTankId },
    { key: 'maxXp' as const, value: source.maxXp, tankId: source.maxXpTankId },
    { key: 'maxFrags' as const, value: source.maxFrags, tankId: source.maxFragsTankId }
  ].flatMap(({ key, value, tankId }) => (value !== null && value > 0 ? [{ key, value, tankId }] : []));
