import { subDays, subHours } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { TankSnapshotTotals } from '../account-ratings.types';

import { buildAccountRatings, earliestCutoff, periodCutoff, ratingHistoryBounds, tankPeriodTotals } from '../account-ratings';
import { RATING_PERIOD_WINDOWS } from '../account-ratings.constants';

const now = new Date('2026-09-24T12:00:00Z');
const baselineAt = subDays(now, 10);
const recentAt = subHours(now, 1);

type TankRowInput = {
  tankId: number;
  capturedAt: Date;
  battles: number;
};

const tankRow = ({ tankId, capturedAt, battles }: TankRowInput): TankSnapshotTotals => ({
  tankId,
  capturedAt,
  battles,
  wins: Math.floor(battles / 2),
  losses: battles - Math.floor(battles / 2),
  damageDealt: battles * 1500,
  damageReceived: battles * 1000,
  frags: battles,
  spotted: battles,
  xp: battles * 700,
  survived: Math.floor(battles / 3),
  hits: battles * 6,
  shots: battles * 8,
  capturePoints: 0,
  droppedCapturePoints: battles
});

const tankSnapshots = [
  tankRow({ tankId: 1, capturedAt: baselineAt, battles: 100 }),
  tankRow({ tankId: 3, capturedAt: baselineAt, battles: 40 }),
  tankRow({ tankId: 1, capturedAt: recentAt, battles: 110 }),
  tankRow({ tankId: 2, capturedAt: recentAt, battles: 5 })
];

const accountSnapshots = [
  { capturedAt: baselineAt, battles: 140 },
  { capturedAt: recentAt, battles: 155 }
];

const build = () =>
  buildAccountRatings({
    accountId: 1n,
    accountSnapshots,
    tankSnapshots,
    expected: new Map(),
    tiers: new Map([
      [1, 8],
      [2, 10],
      [3, 6]
    ]),
    references: new Map(),
    now
  });

describe('periodCutoff', () => {
  it('uses the newest snapshot at or before the window start', () => {
    expect(periodCutoff({ window: { kind: 'duration', days: 7 }, accountSnapshots, now })).toEqual({ cutoff: baselineAt, isPartial: false });
  });

  it('falls back to the earliest snapshot and flags a partial window', () => {
    expect(periodCutoff({ window: { kind: 'duration', days: 30 }, accountSnapshots, now })).toEqual({ cutoff: baselineAt, isPartial: true });
  });

  it('returns null when there is only one snapshot', () => {
    expect(periodCutoff({ window: { kind: 'duration', days: 1 }, accountSnapshots: accountSnapshots.slice(0, 1), now })).toBeNull();
  });
});

describe('tankPeriodTotals', () => {
  it('treats a tank first seen after the cutoff as starting from zero', () => {
    const { from, to } = tankPeriodTotals({ tankSnapshots, cutoff: baselineAt });

    expect(to.map((tank) => tank.tankId).sort()).toEqual([1, 2, 3]);
    expect(from.map((tank) => tank.tankId).sort()).toEqual([1, 3]);
  });
});

describe('buildAccountRatings', () => {
  const { ratings, tankRatings } = build();
  const byPeriod = new Map(ratings.map((rating) => [rating.period, rating]));

  it('sums every latest tank snapshot for the overall period', () => {
    const latest = [110, 5, 40];

    expect(byPeriod.get('overall')?.battles).toBe(latest.reduce((sum, value) => sum + value, 0));
  });

  it('counts only battles played after the cutoff for a recent period', () => {
    const played = 110 - 100 + 5;

    expect(byPeriod.get('h24')?.battles).toBe(played);
    expect(byPeriod.get('d7')?.battles).toBe(played);
  });

  it('keeps untouched tanks out of the recent-period tank ratings', () => {
    const recentTanks = tankRatings.filter((rating) => rating.period === 'd7').map((rating) => rating.tankId);

    expect(recentTanks.sort()).toEqual([1, 2]);
  });

  it('computes an average tier weighted by battles', () => {
    const expectedTier = (10 * 8 + 5 * 10) / 15;

    expect(byPeriod.get('d7')?.avgTier).toBeCloseTo(expectedTier);
  });

  it('averages the experience of every tank in the overall period', () => {
    const overall = tankRatings.filter((rating) => rating.period === 'overall');

    expect(overall.map((rating) => rating.avgXp)).toEqual(overall.map(() => 700));
  });

  it('averages the experience of a tank first seen after the cutoff', () => {
    const fresh = tankRatings.find((rating) => rating.period === 'd7' && rating.tankId === 2);

    expect(fresh?.avgXp).toBe(700);
  });

  it('leaves WN8 empty without expected values', () => {
    expect(byPeriod.get('overall')?.wn8).toBeNull();
  });
});

describe('earliestCutoff', () => {
  const history = [
    { capturedAt: subDays(now, 90), battles: 100 },
    { capturedAt: subDays(now, 40), battles: 1_300 },
    { capturedAt: subDays(now, 2), battles: 1_400 },
    { capturedAt: recentAt, battles: 1_410 }
  ];

  it('is the oldest baseline any rating period needs, so older history can stay in the database', () => {
    const cutoff = earliestCutoff({ accountSnapshots: history, now });
    const periods = [1, 7, 30, 60].map((days) => periodCutoff({ window: { kind: 'duration', days }, accountSnapshots: history, now })?.cutoff);

    expect(cutoff).toEqual(new Date(Math.min(...periods.flatMap((date) => (date ? [date.getTime()] : [])))));
  });

  it('is null without two account snapshots, when no recent period can be rated', () => {
    expect(earliestCutoff({ accountSnapshots: history.slice(0, 1), now })).toBeNull();
    expect(earliestCutoff({ accountSnapshots: [], now })).toBeNull();
  });

  it('rates the same from the history past the cutoff plus the last row before it as from the whole history', () => {
    const tanks = [
      tankRow({ tankId: 1, capturedAt: subDays(now, 150), battles: 4 }),
      tankRow({ tankId: 1, capturedAt: subDays(now, 120), battles: 10 }),
      tankRow({ tankId: 2, capturedAt: subDays(now, 300), battles: 20 }),
      tankRow({ tankId: 1, capturedAt: subDays(now, 80), battles: 60 }),
      tankRow({ tankId: 1, capturedAt: subDays(now, 20), battles: 900 }),
      tankRow({ tankId: 1, capturedAt: subDays(now, 1), battles: 950 }),
      tankRow({ tankId: 2, capturedAt: subDays(now, 200), battles: 30 }),
      tankRow({ tankId: 3, capturedAt: subDays(now, 3), battles: 12 })
    ];

    const cutoff = earliestCutoff({ accountSnapshots: history, now }) ?? now;
    const lastBefore = [1, 2, 3].flatMap((tankId) => tanks.filter((row) => row.tankId === tankId && row.capturedAt <= cutoff).slice(-1));
    const trimmed = [...lastBefore, ...tanks.filter((row) => row.capturedAt > cutoff)];
    const rate = (tankSnapshots: TankSnapshotTotals[]) =>
      buildAccountRatings({
        accountId: 1n,
        accountSnapshots: history,
        tankSnapshots,
        expected: new Map(),
        tiers: new Map(),
        references: new Map(),
        now
      });

    expect(trimmed.length).toBeLessThan(tanks.length);
    expect(rate(trimmed)).toEqual(rate(tanks));
  });
});

const windowDays = RATING_PERIOD_WINDOWS.flatMap(({ window }) => (window.kind === 'duration' ? [window.days] : []));
const windowBattles = RATING_PERIOD_WINDOWS.flatMap(({ window }) => (window.kind === 'battles' ? [window.count] : []));

describe('ratingHistoryBounds', () => {
  it('reaches back as far as every duration period needs', () => {
    const { since } = ratingHistoryBounds(now);

    expect(windowDays.every((days) => since.getTime() <= subDays(now, days).getTime())).toBe(true);
  });

  it('covers every battle-count period', () => {
    const { battles } = ratingHistoryBounds(now);

    expect(windowBattles.every((count) => battles >= count)).toBe(true);
  });
});
