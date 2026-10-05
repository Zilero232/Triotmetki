import { PLAY_MODES } from '@otmetki/schemas';
import { sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import type { Prisma } from '../../../../../generated';

import { battleRow, STAT_SEED } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { bonusTypesOfMode } from '../../../reference';
import { myModeBattles } from '../my-mode-stats.queries';

const WINDOW = {
  since: new Date('2026-09-28T00:00:00Z'),
  inside: new Date('2026-10-01T10:00:00Z'),
  before: new Date('2026-09-01T10:00:00Z')
} as const;

const later = (minutes: number) => new Date(WINDOW.inside.getTime() + minutes * 60_000);

const replayRow = (overrides: Partial<Prisma.ReplayCreateManyInput> & Pick<Prisma.ReplayCreateManyInput, 'arenaUniqueId'>) =>
  ({
    storageKey: `replay-${overrides.arenaUniqueId}`,
    fileName: `${overrides.arenaUniqueId}.mtreplay`,
    fileSize: 1,
    sha256: `sha-${overrides.arenaUniqueId}`,
    accountId: STAT_SEED.accountId,
    playerAccountIds: [],
    status: 'parsed',
    battleType: '22',
    tankId: STAT_SEED.tankId,
    result: 'win',
    damageDealt: 800,
    xp: 400,
    frags: 2,
    playedAt: later(5),
    ...overrides
  }) satisfies Prisma.ReplayCreateManyInput;

const MODE_TYPES = PLAY_MODES.flatMap((mode) => bonusTypesOfMode(mode));

describeWithDatabase('my mode stats queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'replay', 'player'] });
    await prisma.player.create({ data: { accountId: STAT_SEED.accountId, nickname: 'owner' } });

    await prisma.battle.createMany({
      data: [
        battleRow({ arenaUniqueId: 1n, startedAt: later(1), battleType: '22', xp: 500 }),
        battleRow({ arenaUniqueId: 2n, startedAt: later(2), battleType: '22', result: 'draw', damageDealt: 500, xp: 300, frags: 0, survived: false }),
        battleRow({ arenaUniqueId: 3n, startedAt: later(3), battleType: '1' }),
        battleRow({ arenaUniqueId: 4n, startedAt: later(4), battleType: '43', tankId: STAT_SEED.otherTankId, result: 'loss' }),
        battleRow({ arenaUniqueId: 5n, startedAt: WINDOW.before, battleType: '22' })
      ]
    });

    await prisma.replay.createMany({
      data: [
        replayRow({ arenaUniqueId: 10n }),
        replayRow({ arenaUniqueId: 1n }),
        replayRow({ arenaUniqueId: 11n, status: 'uploaded' }),
        replayRow({ arenaUniqueId: 12n, damageDealt: null })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('folds mod battles and uncovered parsed replays per bonus type and tank', async () => {
    const rows = await myModeBattles({ db: prisma.$kysely, accountId: Number(STAT_SEED.accountId), battleTypes: MODE_TYPES, since: WINDOW.since });

    expect(sortBy(rows, (row) => row.battle_type)).toEqual([
      {
        battle_type: '22',
        tank_id: 1,
        battles: 3,
        wins: 2,
        decided: 2,
        damage: 2300,
        xp: 1200,
        frags: 3,
        survived: 1,
        survival_known: 2,
        last_battle_at: later(5)
      },
      {
        battle_type: '43',
        tank_id: 2,
        battles: 1,
        wins: 0,
        decided: 1,
        damage: 1000,
        xp: 500,
        frags: 1,
        survived: 1,
        survival_known: 1,
        last_battle_at: later(4)
      }
    ]);
  });
});
