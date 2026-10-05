import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { clanActivity } from '../clan-activity.queries';

const SEED = {
  battlesSince: new Date('2026-10-04T12:00:00Z'),
  activeSince: new Date('2026-09-28T12:00:00Z'),
  active: new Date('2026-10-04T20:00:00Z'),
  inactive: new Date('2026-09-01T00:00:00Z')
} as const;

type SnapshotSeed = {
  accountId: bigint;
  battles: number;
  capturedAt: Date;
  mode?: 'all' | 'random';
};

const snapshot = ({ accountId, battles, capturedAt, mode = 'all' }: SnapshotSeed) => ({
  accountId,
  mode,
  capturedAt,
  battles,
  wins: 0,
  losses: 0,
  draws: 0,
  damageDealt: 0n,
  damageReceived: 0n,
  frags: 0,
  spotted: 0,
  xp: 0n,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 0
});

const rating = ({
  accountId,
  wn8,
  winRate,
  period = 'overall'
}: {
  accountId: bigint;
  wn8: number | null;
  winRate: number;
  period?: 'd7' | 'overall';
}) => ({
  accountId,
  period,
  battles: 100,
  winRate,
  avgDamage: 0,
  avgFrags: 0,
  wn8
});

describeWithDatabase('clanActivity', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_snapshot', 'account_rating', 'clan_member', 'clan', 'player'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const seed = async () => {
    await prisma.clan.createMany({ data: [10n, 20n, 30n].map((clanId) => ({ clanId, tag: `C${clanId}`, name: `Clan ${clanId}` })) });

    await prisma.player.createMany({
      data: [
        { accountId: 1n, nickname: 'grinder', lastBattleAt: SEED.active },
        { accountId: 2n, nickname: 'newcomer', lastBattleAt: SEED.inactive },
        { accountId: 3n, nickname: 'reset', lastBattleAt: null },
        { accountId: 4n, nickname: 'boundary', lastBattleAt: SEED.activeSince },
        { accountId: 5n, nickname: 'idle', lastBattleAt: SEED.inactive },
        { accountId: 6n, nickname: 'outsider', lastBattleAt: SEED.active }
      ]
    });

    await prisma.clanMember.createMany({
      data: [
        { accountId: 1n, clanId: 10n, role: 'private' },
        { accountId: 2n, clanId: 10n, role: 'private' },
        { accountId: 3n, clanId: 10n, role: 'private' },
        { accountId: 4n, clanId: 10n, role: 'private' },
        { accountId: 5n, clanId: 20n, role: 'private' },
        { accountId: 6n, clanId: 30n, role: 'private' }
      ]
    });

    await prisma.accountSnapshot.createMany({
      data: [
        snapshot({ accountId: 1n, battles: 90, capturedAt: new Date('2026-10-01T00:00:00Z') }),
        snapshot({ accountId: 1n, battles: 100, capturedAt: new Date('2026-10-04T06:00:00Z') }),
        snapshot({ accountId: 1n, battles: 120, capturedAt: new Date('2026-10-04T18:00:00Z') }),
        snapshot({ accountId: 1n, battles: 130, capturedAt: new Date('2026-10-05T06:00:00Z') }),
        snapshot({ accountId: 2n, battles: 50, capturedAt: new Date('2026-10-05T06:00:00Z') }),
        snapshot({ accountId: 3n, battles: 200, capturedAt: new Date('2026-10-03T00:00:00Z') }),
        snapshot({ accountId: 3n, battles: 150, capturedAt: new Date('2026-10-05T06:00:00Z') }),
        snapshot({ accountId: 4n, battles: 10, capturedAt: SEED.battlesSince }),
        snapshot({ accountId: 4n, battles: 1, capturedAt: new Date('2026-10-01T00:00:00Z'), mode: 'random' }),
        snapshot({ accountId: 4n, battles: 15, capturedAt: new Date('2026-10-05T06:00:00Z') }),
        snapshot({ accountId: 4n, battles: 999, capturedAt: new Date('2026-10-05T07:00:00Z'), mode: 'random' }),
        snapshot({ accountId: 6n, battles: 1, capturedAt: new Date('2026-10-01T00:00:00Z') }),
        snapshot({ accountId: 6n, battles: 9, capturedAt: new Date('2026-10-05T06:00:00Z') })
      ]
    });

    await prisma.accountRating.createMany({
      data: [
        rating({ accountId: 1n, wn8: 1000, winRate: 50 }),
        rating({ accountId: 2n, wn8: 2000, winRate: 60 }),
        rating({ accountId: 4n, wn8: null, winRate: 40 }),
        rating({ accountId: 4n, wn8: 9000, winRate: 90, period: 'd7' }),
        rating({ accountId: 6n, wn8: 3000, winRate: 70 })
      ]
    });
  };

  it('sums the battles gained since the window start and averages the ratings per requested clan', async () => {
    await seed();

    const rows = await clanActivity({ db: prisma.$kysely, clanIds: [10, 20], battlesSince: SEED.battlesSince, activeSince: SEED.activeSince });

    expect(rows.toSorted((left, right) => left.clanId - right.clanId)).toEqual([
      { clanId: 10, battlesDelta: 35, avgWn8: 1500, avgWinRate: 50, activeMembers7d: 2 },
      { clanId: 20, battlesDelta: null, avgWn8: null, avgWinRate: null, activeMembers7d: 0 }
    ]);
  });
});
