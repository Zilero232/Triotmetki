import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { RetentionQueries } from '../../queries/retention.types';

import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { RETENTION } from '../../config/purge.constants';
import { RetentionService } from '../retention.service';

const now = new Date('2026-09-27T12:00:00Z');

const createRetention = () => {
  const queries = mock<RetentionQueries>();

  queries.deleteExpiredBatch.mockResolvedValue(0);

  return { queries, retention: new RetentionService(mockPrismaService(), queries) };
};

describe('RetentionService.purgeExpired', () => {
  it('runs every retention rule with its own cutoff', async () => {
    const { queries, retention } = createRetention();

    const result = await retention.purgeExpired(now);

    expect(Object.keys(result)).toEqual(RETENTION.rules.map((rule) => rule.table));
    expect(queries.deleteExpiredBatch.mock.calls.map(([{ cutoff }]) => cutoff)).toEqual(RETENTION.rules.map((rule) => subDays(now, rule.days)));
  });

  it('keeps deleting a table in batches until a batch comes back short', async () => {
    const { queries, retention } = createRetention();
    const [first] = RETENTION.rules;

    queries.deleteExpiredBatch.mockResolvedValueOnce(RETENTION.deleteBatch).mockResolvedValueOnce(3);

    const result = await retention.purgeExpired(now);

    expect(result[first.table]).toBe(RETENTION.deleteBatch + 3);
    expect(queries.deleteExpiredBatch).toHaveBeenCalledTimes(RETENTION.rules.length + 1);
  });

  it('deletes in batches of the configured size', async () => {
    const { queries, retention } = createRetention();

    await retention.purgeExpired(now);

    expect(new Set(queries.deleteExpiredBatch.mock.calls.map(([{ limit }]) => limit))).toEqual(new Set([RETENTION.deleteBatch]));
  });
});
