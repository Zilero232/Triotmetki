import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow, STAT_SEED, tankDeltaRow } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { rngBattles } from '../rng-battles.queries';

const STARTED_AT = new Date('2026-09-20T10:00:00.000Z');
const RECEIVED_AT = new Date('2026-09-21T00:00:00.000Z');
const UNTIL = new Date('2026-09-26T00:00:00.000Z');
const SHOTS = [{ damage: 400, nominal: 400, shell: 'armor_piercing', outcome: 'damage', distance: 100, fatal: false }];

const TANK = { corroborated: STAT_SEED.tankId, unwitnessed: 2, outdamaged: 3 } as const;

const battle = (id: string, overrides: Partial<Parameters<typeof battleRow>[0]> = {}) =>
  battleRow({
    id,
    arenaUniqueId: BigInt(id.replace(/\D/g, '')),
    startedAt: STARTED_AT,
    receivedAt: RECEIVED_AT,
    shots: SHOTS,
    shotsFired: 3,
    shotsHit: 2,
    shotsPierced: 1,
    ...overrides
  });

describeWithDatabase('rngBattles', () => {
  const prisma = createTestPrisma();

  const read = (input: Omit<Parameters<typeof rngBattles>[0], 'db' | 'until'> & { until?: Date }) =>
    rngBattles({ db: prisma.$kysely, until: UNTIL, ...input });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'tank_battle_delta', 'player'] });
    await prisma.player.create({ data: { accountId: STAT_SEED.accountId, nickname: 'Shooter' } });

    await prisma.tankBattleDelta.createMany({
      data: [
        tankDeltaRow({ tankId: TANK.corroborated, capturedAt: new Date('2026-09-20T12:00:00.000Z') }),
        tankDeltaRow({ tankId: TANK.outdamaged, capturedAt: new Date('2026-09-20T12:00:00.000Z'), damageDealt: 10 })
      ]
    });

    await prisma.battle.createMany({
      data: [
        battle('b-1'),
        battle('b-2'),
        battle('b-3', { receivedAt: new Date('2026-09-22T00:00:00.000Z') }),
        battle('b-4', { shots: undefined }),
        battle('b-5', { receivedAt: new Date('2026-09-27T00:00:00.000Z') }),
        battle('b-6', { tankId: TANK.unwitnessed }),
        battle('b-7', { tankId: TANK.outdamaged }),
        battle('b-8', { battleType: '7' })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads corroborated battles with shots received before the cut-off, oldest first and by id on ties', async () => {
    const rows = await read({ watermark: null, limit: 100 });

    expect(rows.map(({ id }) => id)).toEqual(['b-1', 'b-2', 'b-3']);
  });

  it('answers the columns the fold reads', async () => {
    const [first] = await read({ watermark: null, limit: 1 });

    expect(first).toMatchObject({
      id: 'b-1',
      accountId: Number(STAT_SEED.accountId),
      tankId: TANK.corroborated,
      startedAt: STARTED_AT,
      receivedAt: RECEIVED_AT,
      shots: SHOTS,
      shotsFired: 3,
      shotsHit: 2,
      shotsPierced: 1
    });
  });

  it('resumes strictly after the watermark, comparing the receive time first and the id second', async () => {
    expect((await read({ watermark: { receivedAt: RECEIVED_AT, id: 'b-1' }, limit: 100 })).map(({ id }) => id)).toEqual(['b-2', 'b-3']);
    expect((await read({ watermark: { receivedAt: RECEIVED_AT, id: 'b-2' }, limit: 100 })).map(({ id }) => id)).toEqual(['b-3']);
  });

  it('stops at the limit', async () => {
    expect((await read({ watermark: null, limit: 2 })).map(({ id }) => id)).toEqual(['b-1', 'b-2']);
  });

  it('excludes battles received at the cut-off itself', async () => {
    expect((await read({ watermark: null, limit: 100, until: RECEIVED_AT })).map(({ id }) => id)).toEqual([]);
  });
});
