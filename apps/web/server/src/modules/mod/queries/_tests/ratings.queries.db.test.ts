import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { bonusTypesOfMode } from '../../../reference';
import { tankRecords } from '../ratings.queries';

const SEED = {
  accountId: 20_001n,
  otherAccountId: 20_002n,
  startedAt: new Date('2026-10-01T12:00:00Z')
} as const;

const RANDOM = bonusTypesOfMode('random');

describeWithDatabase('tankRecords', () => {
  const prisma = createTestPrisma();
  let arena = 0n;

  const battle = (overrides: {
    accountId?: bigint;
    tankId: number;
    battleType?: string;
    damageDealt: number;
    radio: number;
    track: number;
    stun?: number;
    frags: number;
    xp: number;
  }) => {
    arena += 1n;

    return prisma.battle.create({
      data: {
        accountId: overrides.accountId ?? SEED.accountId,
        arenaUniqueId: arena,
        tankId: overrides.tankId,
        arenaId: 'map',
        battleType: overrides.battleType ?? RANDOM[0] ?? '1',
        result: 'win',
        damageDealt: overrides.damageDealt,
        damageAssistedRadio: overrides.radio,
        damageAssistedTrack: overrides.track,
        damageAssistedStun: overrides.stun ?? 0,
        damageBlocked: 0,
        damageReceived: 0,
        spotted: 0,
        frags: overrides.frags,
        xp: overrides.xp,
        survived: true,
        startedAt: SEED.startedAt
      }
    });
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: SEED.accountId, nickname: 'Owner' },
        { accountId: SEED.otherAccountId, nickname: 'Other' }
      ]
    });

    await battle({ tankId: 1, damageDealt: 3000, radio: 100, track: 900, frags: 1, xp: 800 });
    await battle({ tankId: 1, damageDealt: 1500, radio: 2000, track: 500, stun: 9000, frags: 4, xp: 1200 });
    await battle({ tankId: 2, damageDealt: 700, radio: 0, track: 0, frags: 0, xp: 300 });
    await battle({ tankId: 1, battleType: '22', damageDealt: 9000, radio: 9000, track: 9000, frags: 9, xp: 9000 });
    await battle({ accountId: SEED.otherAccountId, tankId: 1, damageDealt: 8000, radio: 0, track: 0, frags: 8, xp: 8000 });
    await battle({ tankId: 3, damageDealt: 5000, radio: 0, track: 0, frags: 5, xp: 5000 });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('takes per-tank maxima of the account over the requested tanks and battle types, assistance without stun', async () => {
    const rows = await tankRecords({ db: prisma.$kysely, accountId: Number(SEED.accountId), tankIds: [1, 2], battleTypes: RANDOM });

    const expected = [
      { tankId: 1, maxDamage: 3000, maxAssist: 2500, maxFrags: 4, maxXp: 1200 },
      { tankId: 2, maxDamage: 700, maxAssist: 0, maxFrags: 0, maxXp: 300 }
    ];

    expect([...rows].sort((left, right) => left.tankId - right.tankId)).toEqual(expected);
  });

  it('returns no row for a requested tank without battles', async () => {
    const rows = await tankRecords({ db: prisma.$kysely, accountId: Number(SEED.accountId), tankIds: [99], battleTypes: RANDOM });

    expect(rows).toEqual([]);
  });
});
