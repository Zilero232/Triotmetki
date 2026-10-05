import type { TankTotals } from '@otmetki/ratings';

import { bronyaIndex, computeAverages, percentileOf, periodRatings, pickSnapshotPair, tankWn8 } from '@otmetki/ratings';
import { subDays } from 'date-fns';
import { findLast, firstBy, groupBy, sortBy } from 'remeda';

import type {
  AccountRatingsResult,
  BuildAccountRatingsInput,
  EarliestCutoffInput,
  PeriodCutoff,
  PeriodCutoffInput,
  PeriodRowsInput,
  RatingHistoryBounds,
  TankPeriodTotalsInput,
  TankSnapshotTotals
} from './account-ratings.types';

import { RATING_PERIOD_WINDOWS } from './account-ratings.constants';

const toTankTotals = (row: TankSnapshotTotals): TankTotals => ({
  tankId: row.tankId,
  battles: row.battles,
  wins: row.wins,
  losses: row.losses,
  damageDealt: row.damageDealt,
  damageReceived: row.damageReceived,
  frags: row.frags,
  spotted: row.spotted,
  xp: row.xp,
  survivedBattles: row.survived,
  hits: row.hits,
  shots: row.shots,
  capturePoints: row.capturePoints,
  droppedCapturePoints: row.droppedCapturePoints
});

export const periodCutoff = ({ window, accountSnapshots, now }: PeriodCutoffInput): PeriodCutoff | null => {
  const pair = pickSnapshotPair({
    snapshots: accountSnapshots.map((snapshot) => ({ takenAt: snapshot.capturedAt, battles: snapshot.battles })),
    window,
    now
  });

  return pair ? { cutoff: pair.from.takenAt, isPartial: pair.isPartial } : null;
};

export const earliestCutoff = ({ accountSnapshots, now }: EarliestCutoffInput): Date | null =>
  firstBy(
    RATING_PERIOD_WINDOWS.flatMap(({ window }) => periodCutoff({ window, accountSnapshots, now })?.cutoff ?? []),
    (cutoff) => cutoff.getTime()
  ) ?? null;

export const ratingHistoryBounds = (now: Date): RatingHistoryBounds => {
  const windows = RATING_PERIOD_WINDOWS.map(({ window }) => window);
  const days = Math.max(...windows.flatMap((window) => (window.kind === 'duration' ? [window.days] : [])));
  const battles = Math.max(...windows.flatMap((window) => (window.kind === 'battles' ? [window.count] : [])));

  return { since: subDays(now, days), battles };
};

export const tankPeriodTotals = ({ tankSnapshots, cutoff }: TankPeriodTotalsInput) => {
  const from: TankTotals[] = [];
  const to: TankTotals[] = [];
  let toCapturedAt: Date | null = null;

  for (const rows of Object.values(groupBy(tankSnapshots, (row) => row.tankId))) {
    const ordered = sortBy(rows, (row) => row.capturedAt.getTime());
    const last = ordered.at(-1);

    if (!last) {
      continue;
    }

    to.push(toTankTotals(last));

    if (!toCapturedAt || last.capturedAt > toCapturedAt) {
      toCapturedAt = last.capturedAt;
    }

    const start = cutoff ? findLast(ordered, (row) => row.capturedAt.getTime() <= cutoff.getTime()) : undefined;

    if (start) {
      from.push(toTankTotals(start));
    }
  }

  return { from, to, toCapturedAt };
};

const periodRows = ({ input, period, cutoff }: PeriodRowsInput): AccountRatingsResult => {
  const { from, to, toCapturedAt } = tankPeriodTotals({ tankSnapshots: input.tankSnapshots, cutoff });
  const result = periodRatings({ from, to, expected: input.expected, tiers: input.tiers });

  if (result.totals.battles === 0) {
    return { ratings: [], tankRatings: [] };
  }

  const bronya = bronyaIndex({ tanks: result.tanks, references: input.references });

  const tankRatings = result.tanks.map((tank) => {
    const averages = computeAverages(tank);
    const expected = input.expected.get(tank.tankId);
    const reference = input.references.get(tank.tankId);

    return {
      accountId: input.accountId,
      tankId: tank.tankId,
      period,
      battles: tank.battles,
      winRate: averages.winRate,
      avgDamage: averages.damage,
      avgFrags: averages.frags,
      avgXp: averages.xp ?? 0,
      wn8: expected ? tankWn8({ totals: tank, expected }) : null,
      damagePercentile: reference ? percentileOf({ value: averages.damage, quantiles: reference.quantiles.damage }) : null
    };
  });

  const rating = {
    accountId: input.accountId,
    period,
    battles: result.totals.battles,
    winRate: result.averages.winRate,
    avgDamage: result.averages.damage,
    avgFrags: result.averages.frags,
    avgTier: result.averageTier,
    wn8: result.wn8,
    eff: result.eff,
    broneIndex: bronya.index,
    fromCapturedAt: cutoff,
    toCapturedAt
  };

  return { ratings: [rating], tankRatings };
};

export const buildAccountRatings = (input: BuildAccountRatingsInput): AccountRatingsResult => {
  const results = [periodRows({ input, period: 'overall', cutoff: null })];

  for (const { period, window } of RATING_PERIOD_WINDOWS) {
    const cutoff = periodCutoff({ window, accountSnapshots: input.accountSnapshots, now: input.now });

    if (cutoff) {
      results.push(periodRows({ input, period, cutoff: cutoff.cutoff }));
    }
  }

  return {
    ratings: results.flatMap((result) => result.ratings),
    tankRatings: results.flatMap((result) => result.tankRatings)
  };
};
