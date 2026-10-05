import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TankThreshold } from '../../../../../generated';
import type { ThresholdsQueries } from '../../queries/thresholds.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { THRESHOLD_LEVELS, THRESHOLD_SOURCE_PRIORITY } from '../../config/thresholds.constants';
import { ThresholdsReaderService } from '../thresholds-reader.service';

const [PREFERRED, FALLBACK] = THRESHOLD_SOURCE_PRIORITY;

const row = ({
  kind,
  tankId,
  source,
  level4 = 4000
}: Pick<TankThreshold, 'kind' | 'source' | 'tankId'> & { level4?: number | null }): TankThreshold => ({
  kind,
  tankId,
  source,
  date: new Date('2026-01-01T00:00:00.000Z'),
  level1: 1000,
  level2: 2000,
  level3: 3000,
  level4,
  sampleSize: null,
  capturedAt: new Date('2026-01-01T00:00:00.000Z')
});

const createService = (rows: TankThreshold[]) => {
  const prisma = mockPrismaService();
  const queries = mock<ThresholdsQueries>();

  queries.latestThresholds.mockImplementation(async ({ kind }) => rows.filter((candidate) => candidate.kind === kind));

  return { service: new ThresholdsReaderService(prisma, queries), prisma, queries };
};

describe('ThresholdsReaderService', () => {
  it('prefers the higher-priority source per tank', async () => {
    const { service } = createService([row({ kind: 'moe', tankId: 1, source: FALLBACK }), row({ kind: 'moe', tankId: 1, source: PREFERRED })]);

    expect((await service.moe(1))?.source).toBe(PREFERRED);
  });

  it('answers null for a tank without thresholds', async () => {
    const { service } = createService([row({ kind: 'moe', tankId: 1, source: PREFERRED })]);

    await expect(service.moe(2)).resolves.toBeNull();
    await expect(service.mastery(1)).resolves.toBeNull();
  });

  it('names the stored levels after the kind they belong to', async () => {
    const moeRow = row({ kind: 'moe', tankId: 1, source: PREFERRED });
    const masteryRow = row({ kind: 'mastery', tankId: 1, source: PREFERRED });
    const { service } = createService([moeRow, masteryRow]);

    const moe = await service.moe(1);
    const mastery = await service.mastery(1);

    expect(moe?.p95).toBe(moeRow[THRESHOLD_LEVELS.moe.p95]);
    expect(moe?.p100).toBe(moeRow[THRESHOLD_LEVELS.moe.p100]);
    expect(mastery?.class3).toBe(masteryRow[THRESHOLD_LEVELS.mastery.class3]);
    expect(mastery?.master).toBe(masteryRow[THRESHOLD_LEVELS.mastery.master]);
  });

  it('skips a mastery row without the ace level', async () => {
    const { service } = createService([row({ kind: 'mastery', tankId: 1, source: PREFERRED, level4: null })]);

    await expect(service.mastery(1)).resolves.toBeNull();
  });

  it('serves repeated reads of the latest thresholds from the cache', async () => {
    const { service, queries } = createService([row({ kind: 'moe', tankId: 1, source: PREFERRED })]);

    await service.latest();
    await service.moe(1);

    expect(queries.latestThresholds).toHaveBeenCalledTimes(2);
  });

  it('caches each source separately', async () => {
    const { service, queries } = createService([row({ kind: 'moe', tankId: 1, source: PREFERRED })]);

    await service.latest();
    await service.latest(FALLBACK);

    expect(queries.latestThresholds).toHaveBeenCalledTimes(4);
  });

  it('filters the MoE history by kind and only by the bounds that were given', async () => {
    const { service, prisma } = createService([]);
    const from = new Date('2026-01-01T00:00:00.000Z');

    prisma.tankThreshold.findMany.mockResolvedValue([]);

    await service.moeHistory({ tankId: 1, from });

    expect(prisma.tankThreshold.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { kind: 'moe', tankId: 1, date: { gte: from } } }));
  });
});
