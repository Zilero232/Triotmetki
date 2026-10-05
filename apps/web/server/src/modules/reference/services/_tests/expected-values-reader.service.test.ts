import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExpectedValuesQueries } from '../../queries/expected-values.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { ExpectedValuesReaderService } from '../expected-values-reader.service';

type ExpectedValueRow = Awaited<ReturnType<ExpectedValuesQueries['latestExpectedValues']>>[number];

const ROW: ExpectedValueRow = { tankId: 1, expDamage: 1800, expSpotted: 1.2, expFrags: 0.9, expDefense: 0.6, expWinRate: 52 };

const createService = (rows: ExpectedValueRow[]) => {
  const queries = mock<ExpectedValuesQueries>();

  queries.latestExpectedValues.mockResolvedValue(rows);

  return { service: new ExpectedValuesReaderService(mockPrismaService(), queries), queries };
};

describe('ExpectedValuesReaderService.all', () => {
  it('maps stored rows to the WN8 expected-values table', async () => {
    const { service } = createService([ROW]);

    expect((await service.all()).get(1)).toEqual({ tankId: 1, expDamage: 1800, expSpot: 1.2, expFrag: 0.9, expDef: 0.6, expWinRate: 52 });
  });

  it('caches a loaded table', async () => {
    const { service, queries } = createService([ROW]);

    await service.all();
    await service.all();

    expect(queries.latestExpectedValues).toHaveBeenCalledOnce();
  });

  it('returns an empty table and retries later when nothing is stored', async () => {
    const { service, queries } = createService([]);

    expect((await service.all()).size).toBe(0);
    await service.all();

    expect(queries.latestExpectedValues).toHaveBeenCalledTimes(2);
  });
});
