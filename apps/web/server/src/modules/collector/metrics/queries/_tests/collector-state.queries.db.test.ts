import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { mergeCollectorState } from '../collector-state.queries';

const SEED = {
  key: 'job-success',
  otherKey: 'circuit-breaker'
} as const;

describeWithDatabase('mergeCollectorState', () => {
  const prisma = createTestPrisma();

  const merge = (value: Record<string, string>) => mergeCollectorState({ db: prisma.$kysely, key: SEED.key, value });

  const stored = (key: string) => prisma.collectorState.findUnique({ where: { key }, select: { value: true } });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['collector_state'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the state on the first write', async () => {
    await merge({ 'collector.poll:batch': '2026-10-05T10:00:00.000Z' });

    expect(await stored(SEED.key)).toEqual({ value: { 'collector.poll:batch': '2026-10-05T10:00:00.000Z' } });
  });

  it('keeps the stored keys and overwrites the ones written again', async () => {
    await merge({ 'collector.poll:batch': '2026-10-05T10:00:00.000Z', 'collector.sweep:batch': '2026-10-05T10:00:00.000Z' });

    await merge({ 'collector.poll:batch': '2026-10-05T11:00:00.000Z', 'collector.reference:wn8-expected': '2026-10-05T11:00:00.000Z' });

    expect(await stored(SEED.key)).toEqual({
      value: {
        'collector.poll:batch': '2026-10-05T11:00:00.000Z',
        'collector.sweep:batch': '2026-10-05T10:00:00.000Z',
        'collector.reference:wn8-expected': '2026-10-05T11:00:00.000Z'
      }
    });
  });

  it('touches the update time and leaves other state rows alone', async () => {
    await prisma.collectorState.create({ data: { key: SEED.otherKey, value: { state: 'closed' } } });
    await prisma.collectorState.create({ data: { key: SEED.key, value: {}, updatedAt: new Date('2026-01-01T00:00:00Z') } });

    await merge({ 'collector.poll:batch': '2026-10-05T10:00:00.000Z' });

    const row = await prisma.collectorState.findUniqueOrThrow({ where: { key: SEED.key } });

    expect(row.updatedAt.getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime());
    expect(await stored(SEED.otherKey)).toEqual({ value: { state: 'closed' } });
  });
});
