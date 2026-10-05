import type { SettingsValues } from '@otmetki/schemas';

import { RATING_SCALES, RATING_TIERS } from '@otmetki/ratings';
import { STREAMER_SETTINGS } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, PlayerSettingsShare, Prisma, SettingsAggregate, StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';

import { streamerProfileRow } from '../../../profiles/services/_tests/streamers.fixtures';
import { aggregateCohort } from '../../lib/settings-aggregate/settings-aggregate';
import { SettingsAggregateService } from '../settings-aggregate.service';

const NOW = new Date('2026-09-20T04:20:00Z');
const COHORT_SIZE = STREAMER_SETTINGS.minCohort;
const CHECKED_AT = '2026-08-01T00:00:00.000Z';

const profileRow = (settings: Prisma.JsonObject): StreamerProfile => streamerProfileRow({ settings, settingsUpdatedAt: NOW });

const creatorRow = (index: number): StreamerProfile =>
  profileRow({ camera: { fov: 90 + (index % 3) * 5, source: 'creator', sourceUrl: null, checkedAt: CHECKED_AT } });

const shareRow = (index: number, accountId: bigint | null = BigInt(1000 + index)): PlayerSettingsShare => ({
  userId: `u${index}`,
  accountId,
  data: { display: { preset: 'high' } },
  anonymousStats: true,
  updatedAt: NOW
});

const aggregateRow = (overrides: Partial<SettingsAggregate>): SettingsAggregate => ({
  cohort: 'all',
  field: 'camera.fov',
  bucket: '90.00',
  count: 1,
  contributors: 1,
  median: null,
  computedAt: NOW,
  ...overrides
});

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.streamerProfile.findMany.mockResolvedValue([]);
  prisma.playerSettingsShare.findMany.mockResolvedValue([]);
  prisma.accountRating.findMany.mockResolvedValue([]);

  return { service: new SettingsAggregateService(prisma), prisma };
};

const writtenRows = (prisma: ReturnType<typeof createService>['prisma']) =>
  prisma.settingsAggregate.createMany.mock.calls.flatMap(([args]) => [args?.data ?? []].flat());

const writtenCohorts = (prisma: ReturnType<typeof createService>['prisma']) => new Set(writtenRows(prisma).map((row) => row.cohort));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SettingsAggregateService.read', () => {
  it('reports no fields and no compute time before the first run', async () => {
    const { service, prisma } = createService();

    prisma.settingsAggregate.findMany.mockResolvedValue([]);

    expect(await service.read('all')).toEqual({ cohort: 'all', minCohort: STREAMER_SETTINGS.minCohort, computedAt: null, fields: [] });
  });

  it('groups buckets by field and marks a field numeric only when it has a median', async () => {
    const { service, prisma } = createService();

    prisma.settingsAggregate.findMany.mockResolvedValue([
      aggregateRow({ field: 'camera.fov', bucket: '90.00', count: 12, contributors: 20, median: 92.5 }),
      aggregateRow({ field: 'camera.fov', bucket: '95.00', count: 8, contributors: 20, median: 92.5 }),
      aggregateRow({ field: 'display.preset', bucket: 'high', count: 25, contributors: 25, median: null })
    ]);

    const result = await service.read('all');

    expect(result.computedAt).toBe(NOW.toISOString());

    expect(result.fields).toEqual([
      {
        field: 'camera.fov',
        kind: 'numeric',
        contributors: 20,
        median: 92.5,
        buckets: [
          { bucket: '90.00', count: 12 },
          { bucket: '95.00', count: 8 }
        ]
      },
      { field: 'display.preset', kind: 'categorical', contributors: 25, median: null, buckets: [{ bucket: 'high', count: 25 }] }
    ]);
  });
});

describe('SettingsAggregateService.compute', () => {
  it('replaces the aggregates of every cohort even when a cohort is too small', async () => {
    const { service, prisma } = createService();

    await service.compute();

    expect(prisma.settingsAggregate.deleteMany.mock.calls.map(([args]) => args?.where?.cohort)).toEqual([...STREAMER_SETTINGS.cohorts]);
  });

  it('writes exactly the buckets the cohort aggregation yields and returns their count', async () => {
    const { service, prisma } = createService();
    const creators = range(COHORT_SIZE).map(creatorRow);

    prisma.streamerProfile.findMany.mockResolvedValue(creators);

    const written = await service.compute();
    const contributions: SettingsValues[] = creators.map((_, index) => ({ camera: { fov: 90 + (index % 3) * 5 } }));
    const expected = aggregateCohort({ contributions, minCohort: STREAMER_SETTINGS.minCohort }).flatMap((row) => row.buckets);

    expect(written).toBe(writtenRows(prisma).length);
    expect(writtenRows(prisma).filter((row) => row.cohort === 'creators')).toHaveLength(expected.length);
    expect(writtenRows(prisma).every((row) => row.computedAt instanceof Date && row.computedAt.getTime() === NOW.getTime())).toBe(true);
  });

  it('counts creators in the all cohort but not in the top cohort', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue(range(COHORT_SIZE).map(creatorRow));

    await service.compute();

    expect(writtenCohorts(prisma)).toEqual(new Set(['creators', 'all']));
  });

  it('pools creators and anonymous players to reach the all cohort threshold', async () => {
    const { service, prisma } = createService();
    const half = Math.ceil(COHORT_SIZE / 2);

    prisma.streamerProfile.findMany.mockResolvedValue(
      range(half).map(() => profileRow({ display: { preset: 'high', source: 'creator', sourceUrl: null, checkedAt: CHECKED_AT } }))
    );

    prisma.playerSettingsShare.findMany.mockResolvedValue(range(COHORT_SIZE - half).map((index) => shareRow(index)));

    await service.compute();

    expect(writtenCohorts(prisma)).toEqual(new Set(['all']));
  });

  it('puts in the top cohort only players whose overall WN8 reached unicum', async () => {
    const { service, prisma } = createService();
    const shares = range(COHORT_SIZE).map((index) => shareRow(index));

    prisma.playerSettingsShare.findMany.mockResolvedValue([...shares, shareRow(COHORT_SIZE, null)]);
    prisma.accountRating.findMany.mockResolvedValue(shares.map((share) => mock<AccountRating>({ accountId: share.accountId ?? 0n })));

    await service.compute();

    const [ratingQuery] = prisma.accountRating.findMany.mock.calls.map(([args]) => args);
    const top = writtenRows(prisma).filter((row) => row.cohort === 'top');
    const all = writtenRows(prisma).filter((row) => row.cohort === 'all');

    expect(ratingQuery?.where).toMatchObject({ period: 'overall', wn8: { gte: RATING_SCALES.wn8[RATING_TIERS.indexOf('unicum')] } });
    expect(top.map((row) => row.contributors)).toEqual([COHORT_SIZE]);
    expect(all.map((row) => row.contributors)).toEqual([COHORT_SIZE + 1]);
  });

  it('leaves the top cohort empty when no sharing player is a unicum', async () => {
    const { service, prisma } = createService();

    prisma.playerSettingsShare.findMany.mockResolvedValue(range(COHORT_SIZE).map((index) => shareRow(index)));

    await service.compute();

    expect(writtenCohorts(prisma).has('top')).toBe(false);
  });

  it('skips stored settings that no longer match the schema', async () => {
    const { service, prisma } = createService();
    const broken = profileRow({ camera: { fov: 'wide', source: 'creator', sourceUrl: null, checkedAt: CHECKED_AT } });

    prisma.streamerProfile.findMany.mockResolvedValue([...range(COHORT_SIZE - 1).map(creatorRow), broken]);
    prisma.playerSettingsShare.findMany.mockResolvedValue([{ ...shareRow(0), data: { display: { preset: 'cinematic' } } }]);

    expect(await service.compute()).toBe(0);
  });
});
