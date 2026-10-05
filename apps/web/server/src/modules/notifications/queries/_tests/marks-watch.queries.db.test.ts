import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { previousBattleMarks } from '../marks-watch.queries';

const SEED = {
  accountId: 30_001n,
  otherAccountId: 30_002n,
  since: new Date('2026-10-01T12:00:00Z')
} as const;

const minutes = (offset: number) => new Date(SEED.since.getTime() + offset * 60_000);

describeWithDatabase('previousBattleMarks', () => {
  const prisma = createTestPrisma();
  let arena = 0n;

  const battle = async ({
    accountId = SEED.accountId,
    tankId,
    marks,
    startedAt,
    receivedAt
  }: {
    accountId?: bigint;
    tankId: number;
    marks: number | null;
    startedAt: Date;
    receivedAt: Date;
  }) => {
    arena += 1n;

    const row = await prisma.battle.create({
      data: {
        accountId,
        arenaUniqueId: arena,
        tankId,
        arenaId: 'map',
        battleType: '1',
        result: 'win',
        damageDealt: 0,
        damageAssistedRadio: 0,
        damageAssistedTrack: 0,
        damageAssistedStun: 0,
        damageBlocked: 0,
        damageReceived: 0,
        spotted: 0,
        frags: 0,
        xp: 0,
        survived: true,
        marksOnGun: marks,
        startedAt,
        receivedAt
      },
      select: { id: true, accountId: true, tankId: true }
    });

    return row;
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: SEED.accountId, nickname: 'Marks' },
        { accountId: SEED.otherAccountId, nickname: 'Other' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads the marks of the latest earlier battle of each pair the new battles touch', async () => {
    await battle({ tankId: 1, marks: 1, startedAt: minutes(-120), receivedAt: minutes(-110) });
    await battle({ tankId: 1, marks: 2, startedAt: minutes(-60), receivedAt: minutes(-50) });
    await battle({ tankId: 1, marks: null, startedAt: minutes(-30), receivedAt: minutes(-20) });
    await battle({ tankId: 1, marks: 3, startedAt: minutes(-10), receivedAt: minutes(5) });
    await battle({ tankId: 2, marks: 0, startedAt: minutes(-90), receivedAt: minutes(-80) });
    await battle({ accountId: SEED.otherAccountId, tankId: 1, marks: 3, startedAt: minutes(-40), receivedAt: minutes(-35) });

    const fresh = [
      await battle({ tankId: 1, marks: 3, startedAt: minutes(1), receivedAt: minutes(10) }),
      await battle({ tankId: 2, marks: 1, startedAt: minutes(2), receivedAt: minutes(11) }),
      await battle({ tankId: 3, marks: 1, startedAt: minutes(3), receivedAt: minutes(12) })
    ];

    const rows = await previousBattleMarks({ db: prisma.$kysely, battleIds: fresh.map((row) => row.id), since: SEED.since });

    const expected = [
      { accountId: Number(SEED.accountId), tankId: 1, marksOnGun: 2 },
      { accountId: Number(SEED.accountId), tankId: 2, marksOnGun: 0 }
    ];

    expect([...rows].sort((left, right) => left.tankId - right.tankId)).toEqual(expected);
  });

  it('answers one row per pair when several new battles share it', async () => {
    await battle({ tankId: 1, marks: 1, startedAt: minutes(-60), receivedAt: minutes(-50) });

    const fresh = [
      await battle({ tankId: 1, marks: 2, startedAt: minutes(1), receivedAt: minutes(10) }),
      await battle({ tankId: 1, marks: 2, startedAt: minutes(2), receivedAt: minutes(11) })
    ];

    const rows = await previousBattleMarks({ db: prisma.$kysely, battleIds: fresh.map((row) => row.id), since: SEED.since });

    expect(rows).toEqual([{ accountId: Number(SEED.accountId), tankId: 1, marksOnGun: 1 }]);
  });
});
