import type { ExpectedValues } from '@otmetki/ratings';
import type { ModOverallRatings, ModOverview, ModSessionRatings, ModTankExpected, ModTankRating, ModTankRecords } from '@otmetki/schemas';

import { clamp } from 'remeda';

import type { LatestSessionRow, OverallRatingRow } from '../selects/ratings.selects';
import type { ModOverviewInput, ModTankRatingInput, ModTankRecordsInput } from './ratings.types';

import { clampPercent, ratingValue, ratio, toIso, toNumber, winRatePercent } from '../../../common/lib';
import { MOD_RATINGS_READ } from '../config/ratings.constants';

const toOverall = (rating: OverallRatingRow): ModOverallRatings => ({
  battles: Math.max(0, rating.battles),
  win_rate: rating.battles > 0 ? clampPercent(rating.winRate) : null,
  avg_damage: rating.battles > 0 ? Math.max(0, rating.avgDamage) : null,
  wn8: ratingValue({ kind: 'wn8', value: rating.wn8 }),
  eff: ratingValue({ kind: 'eff', value: rating.eff }),
  brone_index: ratingValue({ kind: 'broneIndex', value: rating.broneIndex }),
  updated_at: rating.computedAt.toISOString()
});

const toSession = (session: LatestSessionRow): ModSessionRatings => ({
  kind: session.kind,
  source: session.source,
  is_live: session.kind === 'live' && session.status === 'open',
  started_at: session.startedAt.toISOString(),
  ended_at: toIso(session.endedAt),
  battles: Math.max(0, session.battles),
  win_rate: clampPercent(winRatePercent({ wins: session.wins, battles: session.battles })),
  avg_damage: ratio({ value: Math.max(0, session.damageDealt), by: session.battles }),
  wn8: ratingValue({ kind: 'wn8', value: session.wn8 }),
  brone_index: ratingValue({ kind: 'broneIndex', value: session.broneIndex })
});

export const toModOverview = ({ accountId, rating, session }: ModOverviewInput): ModOverview => ({
  account_id: toNumber(accountId),
  nickname: rating?.player.nickname ?? null,
  overall: rating ? toOverall(rating) : null,
  session: session ? toSession(session) : null
});

const winRateOf = ({ tank, rating, totals }: ModTankRatingInput): number | null => {
  if (totals) {
    return clampPercent(winRatePercent({ wins: totals.wins, battles: totals.battles }));
  }

  if (tank) {
    return clampPercent(winRatePercent({ wins: tank.wins, battles: tank.battles }));
  }

  return rating && rating.battles > 0 ? clampPercent(rating.winRate) : null;
};

const avgDamageOf = ({ rating, totals }: ModTankRatingInput): number | null => {
  if (totals) {
    return ratio({ value: Math.max(0, totals.damageDealt), by: totals.battles });
  }

  return rating && rating.battles > 0 ? Math.max(0, rating.avgDamage) : null;
};

const marksOf = ({ tank, totals }: ModTankRatingInput): number | null => {
  const marks = tank?.marksOnGun ?? totals?.marksOnGun ?? null;

  return marks === null ? null : clamp(marks, { min: 0, max: MOD_RATINGS_READ.maxMarksOnGun });
};

const highest = (values: (number | null | undefined)[]): number | null => {
  const known = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);

  return known.length === 0 ? null : Math.round(Math.max(...known));
};

export const toModTankRecords = ({ totals, records }: ModTankRecordsInput): ModTankRecords | null => {
  const result = {
    max_damage: highest([records?.maxDamage]),
    max_assist: highest([records?.maxAssist]),
    max_frags: highest([records?.maxFrags, totals?.maxFrags]),
    max_xp: highest([records?.maxXp, totals?.maxXp])
  };

  return Object.values(result).every((value) => value === null) ? null : result;
};

export const toModTankExpected = (expected: ExpectedValues | undefined): ModTankExpected | null => {
  if (!expected || !(expected.expDamage > 0) || !(expected.expWinRate > 0) || expected.expWinRate > MOD_RATINGS_READ.maxPercent) {
    return null;
  }

  return {
    damage: expected.expDamage,
    spot: Math.max(0, expected.expSpot),
    frag: Math.max(0, expected.expFrag),
    def: Math.max(0, expected.expDef),
    win_rate: expected.expWinRate
  };
};

export const toModTankRating = (input: ModTankRatingInput): ModTankRating | null => {
  const { tankId, tank, rating, totals } = input;

  if (!tank && !rating && !totals) {
    return null;
  }

  return {
    tank_id: tankId,
    battles: Math.max(0, totals?.battles ?? tank?.battles ?? rating?.battles ?? 0),
    win_rate: winRateOf(input),
    avg_damage: avgDamageOf(input),
    wn8: ratingValue({ kind: 'wn8', value: rating?.wn8 }),
    moe_percent: clampPercent(tank?.moePercent),
    marks_on_gun: marksOf(input),
    mastery: clamp(tank?.markOfMastery ?? totals?.markOfMastery ?? 0, { min: 0, max: MOD_RATINGS_READ.maxMastery }),
    records: toModTankRecords(input),
    expected: toModTankExpected(input.expected)
  };
};
