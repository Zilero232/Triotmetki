import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../_tests/test-database';
import { lockedTransaction } from '../advisory-lock';

const LOCK_TEST = {
  scope: 'test:advisory-lock',
  blockedWindowMs: 300,
  accountId: 1_000_000_001n
} as const;

const deferred = () => {
  let resolve = () => {};

  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

describeWithDatabase('lockedTransaction', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['player'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('holds a second transaction on the same key until the first commits', async () => {
    const events: string[] = [];
    const firstStarted = deferred();
    const releaseFirst = deferred();

    const first = lockedTransaction({
      prisma,
      scope: LOCK_TEST.scope,
      key: 'same',
      run: async () => {
        events.push('first:start');
        firstStarted.resolve();
        await releaseFirst.promise;
        events.push('first:end');
      }
    });

    await firstStarted.promise;

    const second = lockedTransaction({
      prisma,
      scope: LOCK_TEST.scope,
      key: 'same',
      run: async () => {
        events.push('second:start');
      }
    });

    await delay(LOCK_TEST.blockedWindowMs);
    releaseFirst.resolve();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('lets transactions on different keys run at the same time', async () => {
    const events: string[] = [];
    const firstStarted = deferred();
    const releaseFirst = deferred();

    const first = lockedTransaction({
      prisma,
      scope: LOCK_TEST.scope,
      key: 'one',
      run: async () => {
        events.push('first:start');
        firstStarted.resolve();
        await releaseFirst.promise;
        events.push('first:end');
      }
    });

    await firstStarted.promise;
    await lockedTransaction({ prisma, scope: LOCK_TEST.scope, key: 'two', run: async () => events.push('second') });
    releaseFirst.resolve();
    await first;

    expect(events).toEqual(['first:start', 'second', 'first:end']);
  });

  it('releases the lock when the work throws', async () => {
    const failed = lockedTransaction({
      prisma,
      scope: LOCK_TEST.scope,
      key: 'rollback',
      run: async () => {
        throw new Error('work failed');
      }
    });

    await expect(failed).rejects.toThrow('work failed');

    const result = await lockedTransaction({ prisma, scope: LOCK_TEST.scope, key: 'rollback', run: async () => 'next' });

    expect(result).toBe('next');
  });

  it('runs Kysely queries on the transaction connection', async () => {
    const seen = await lockedTransaction({
      prisma,
      scope: LOCK_TEST.scope,
      key: 'kysely',
      run: async (tx) => {
        await tx.player.create({ data: { accountId: LOCK_TEST.accountId, nickname: 'inside' } });

        const inside = await tx.$kysely.selectFrom('player').select('nickname').where('account_id', '=', Number(LOCK_TEST.accountId)).execute();
        const outside = await prisma.$kysely.selectFrom('player').select('nickname').where('account_id', '=', Number(LOCK_TEST.accountId)).execute();

        return { inside, outside };
      }
    });

    expect(seen).toEqual({ inside: [{ nickname: 'inside' }], outside: [] });
  });

  it('rolls back Kysely writes with the transaction', async () => {
    const failed = lockedTransaction({
      prisma,
      scope: LOCK_TEST.scope,
      key: 'kysely-rollback',
      run: async (tx) => {
        await tx.$kysely
          .insertInto('player')
          .values({ account_id: Number(LOCK_TEST.accountId), nickname: 'rolled-back' })
          .execute();

        throw new Error('abort');
      }
    });

    await expect(failed).rejects.toThrow('abort');

    expect(await prisma.player.count()).toBe(0);
  });
});
