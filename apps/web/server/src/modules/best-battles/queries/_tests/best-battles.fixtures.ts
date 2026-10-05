import type { Prisma } from '../../../../../generated';
import type { createTestPrisma } from '../../../../core/prisma/_tests/test-database';

import { battleRow, tankDeltaRow } from '../../../../core/prisma/_tests/stat-seeds';

type TestPrisma = ReturnType<typeof createTestPrisma>;

export const BB = {
  now: new Date('2026-10-05T12:00:00Z'),
  alpha: 1n,
  bravo: 2n,
  hidden: 3n,
  users: {
    alpha: '00000000-0000-4000-8000-000000000001',
    bravo: '00000000-0000-4000-8000-000000000002',
    hidden: '00000000-0000-4000-8000-000000000003'
  },
  replays: {
    r1: '00000000-0000-4000-9000-000000000001',
    r1Later: '00000000-0000-4000-9000-000000000002',
    r2: '00000000-0000-4000-9000-000000000003',
    r3: '00000000-0000-4000-9000-000000000004',
    r8: '00000000-0000-4000-9000-000000000008',
    r11: '00000000-0000-4000-9000-000000000011',
    r12: '00000000-0000-4000-9000-000000000012',
    r15: '00000000-0000-4000-9000-000000000015'
  }
} as const;

export const BB_TABLES = [
  'battle',
  'tank_battle_delta',
  'replay',
  'user_lesta_account',
  'user',
  'player',
  'vehicle',
  'arena',
  'achievement',
  'premium_offer'
] as const;

const at = (iso: string) => new Date(`${iso}Z`);

const battle = (overrides: Partial<Prisma.BattleCreateManyInput> & Pick<Prisma.BattleCreateManyInput, 'arenaUniqueId' | 'startedAt'>) =>
  battleRow({ achievements: [], ...overrides });

const delta = ({ accountId, tankId, capturedAt, damageDealt }: { accountId: bigint; tankId: number; capturedAt: string; damageDealt: number }) =>
  tankDeltaRow({ accountId, tankId, capturedAt: at(capturedAt), battles: 1, damageDealt, frags: 5 });

let replaySeq = 0;

const replay = (overrides: Partial<Prisma.ReplayCreateManyInput>) => {
  replaySeq += 1;

  return {
    storageKey: `replay-${replaySeq}`,
    fileName: `${replaySeq}.mtreplay`,
    fileSize: 1,
    sha256: `sha-${replaySeq}`,
    status: 'parsed',
    visibility: 'public',
    battleType: '1',
    arenaId: 'map_a',
    result: 'win',
    medals: [],
    playerAccountIds: [],
    ...overrides
  } satisfies Prisma.ReplayCreateManyInput;
};

const seedReference = async (prisma: TestPrisma) => {
  await prisma.vehicle.createMany({
    data: [
      { tankId: 11, name: 'Heavy X', shortName: 'HX', slug: 'heavy-x', nation: 'ussr', type: 'heavyTank', tier: 10 },
      { tankId: 12, name: 'Medium X', shortName: 'MX', slug: 'medium-x', nation: 'germany', type: 'mediumTank', tier: 10 },
      { tankId: 13, name: 'Medium VIII', shortName: 'M8', slug: 'medium-viii', nation: 'usa', type: 'mediumTank', tier: 8 }
    ]
  });

  await prisma.arena.createMany({
    data: [
      { arenaId: 'map_a', name: 'Map A', slug: 'map-a' },
      { arenaId: 'map_b', name: 'Map B', slug: 'map-b' }
    ]
  });

  await prisma.achievement.createMany({
    data: [
      { name: 'medalKay', title: 'Kay', image: 'kay.png' },
      { name: 'warrior', title: 'Warrior' }
    ]
  });
};

const seedAccounts = async (prisma: TestPrisma) => {
  await prisma.player.createMany({
    data: [
      { accountId: BB.alpha, nickname: 'Alpha' },
      { accountId: BB.bravo, nickname: 'Bravo' },
      { accountId: BB.hidden, nickname: 'Hidden', isHidden: true }
    ]
  });

  await prisma.user.createMany({
    data: [
      { id: BB.users.alpha, name: 'alpha', email: 'alpha@example.test' },
      { id: BB.users.bravo, name: 'bravo', email: 'bravo@example.test' },
      { id: BB.users.hidden, name: 'hidden', email: 'hidden@example.test' }
    ]
  });

  await prisma.userLestaAccount.createMany({
    data: [
      { userId: BB.users.alpha, accountId: BB.alpha },
      { userId: BB.users.bravo, accountId: BB.bravo },
      { userId: BB.users.hidden, accountId: BB.hidden }
    ]
  });
};

const seedBattles = async (prisma: TestPrisma) => {
  await prisma.battle.createMany({
    data: [
      battle({
        accountId: BB.alpha,
        tankId: 11,
        arenaId: 'map_a',
        damageDealt: 5000,
        arenaUniqueId: 101n,
        startedAt: at('2026-10-04T18:00:00'),
        achievements: ['medalKay', 'warrior']
      }),
      battle({
        accountId: BB.bravo,
        tankId: 12,
        arenaId: 'map_b',
        damageDealt: 4000,
        arenaUniqueId: 102n,
        startedAt: at('2026-10-03T12:00:00'),
        achievements: ['warrior']
      }),
      battle({ accountId: BB.bravo, tankId: 12, arenaId: 'map_b', damageDealt: 4000, arenaUniqueId: 109n, startedAt: at('2026-10-02T12:00:00') }),
      battle({ accountId: BB.alpha, tankId: 13, arenaId: 'map_a', damageDealt: 9000, arenaUniqueId: 103n, startedAt: at('2026-10-04T20:00:00') }),
      battle({
        accountId: BB.hidden,
        tankId: 11,
        damageDealt: 8000,
        arenaUniqueId: 104n,
        startedAt: at('2026-10-04T13:00:00'),
        achievements: ['warrior']
      }),
      battle({
        accountId: BB.bravo,
        tankId: 13,
        arenaId: 'map_a',
        damageDealt: 3000,
        arenaUniqueId: 105n,
        startedAt: at('2026-09-30T12:00:00'),
        achievements: ['unknownMedal']
      }),
      battle({ accountId: BB.bravo, tankId: 11, arenaId: 'map_b', damageDealt: 7000, arenaUniqueId: 106n, startedAt: at('2026-09-20T12:00:00') }),
      battle({ accountId: BB.alpha, tankId: 11, battleType: '7', damageDealt: 6000, arenaUniqueId: 107n, startedAt: at('2026-10-04T14:00:00') }),
      battle({ accountId: BB.alpha, tankId: 12, arenaId: 'map_b', damageDealt: 2000, arenaUniqueId: 108n, startedAt: at('2026-10-05T08:00:00') })
    ]
  });

  await prisma.tankBattleDelta.createMany({
    data: [
      delta({ accountId: BB.alpha, tankId: 11, capturedAt: '2026-10-04T19:00:00', damageDealt: 5000 }),
      delta({ accountId: BB.alpha, tankId: 13, capturedAt: '2026-10-04T21:00:00', damageDealt: 100 }),
      delta({ accountId: BB.bravo, tankId: 12, capturedAt: '2026-10-03T13:00:00', damageDealt: 4000 }),
      delta({ accountId: BB.bravo, tankId: 13, capturedAt: '2026-09-30T13:00:00', damageDealt: 3000 }),
      delta({ accountId: BB.bravo, tankId: 11, capturedAt: '2026-09-20T13:00:00', damageDealt: 7000 }),
      delta({ accountId: BB.hidden, tankId: 11, capturedAt: '2026-10-04T14:00:00', damageDealt: 8000 })
    ]
  });
};

const recorderSummary = {
  players: [
    { isRecorder: false, result: { spotted: 9, blocked: 9999 } },
    { isRecorder: true, result: { spotted: 2.6, blocked: 450 } }
  ]
};

const visibleReplays = () => [
  replay({
    id: BB.replays.r1,
    uploaderUserId: BB.users.alpha,
    accountId: BB.alpha,
    tankId: 11,
    arenaUniqueId: 101n,
    damageDealt: 5000,
    playedAt: at('2026-10-04T18:00:00'),
    createdAt: at('2026-10-04T19:00:00')
  }),
  replay({
    id: BB.replays.r1Later,
    uploaderUserId: BB.users.alpha,
    accountId: BB.alpha,
    tankId: 11,
    arenaUniqueId: 101n,
    damageDealt: 5000,
    playedAt: at('2026-10-04T18:00:00'),
    createdAt: at('2026-10-04T20:00:00')
  }),
  replay({
    id: BB.replays.r2,
    uploaderUserId: BB.users.alpha,
    accountId: BB.alpha,
    tankId: 13,
    arenaUniqueId: 103n,
    mapName: 'Map A (replay)',
    damageDealt: 9000,
    damageAssisted: 300,
    frags: 3,
    xp: 1200,
    medals: ['medalKay'],
    summary: recorderSummary,
    playedAt: at('2026-10-04T20:00:00')
  }),
  replay({
    id: BB.replays.r3,
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 12,
    arenaUniqueId: 201n,
    arenaId: 'map_c',
    mapName: 'Map C',
    result: 'loss',
    damageDealt: 6500,
    damageAssisted: 100,
    frags: 1,
    xp: 900,
    summary: { recorder: { name: 'BravoRec' }, players: {} },
    playedAt: at('2026-10-05T09:00:00')
  }),
  replay({
    id: BB.replays.r11,
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 12,
    arenaUniqueId: 208n,
    arenaId: 'map_b',
    frags: 7,
    playedAt: at('2026-10-04T22:00:00')
  }),
  replay({
    id: BB.replays.r12,
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 11,
    arenaUniqueId: 209n,
    damageDealt: 9990,
    playedAt: at('2026-09-25T12:00:00')
  }),
  replay({
    id: BB.replays.r15,
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 13,
    arenaId: null,
    damageDealt: 100,
    playedAt: at('2026-10-04T13:00:00')
  })
];

const excludedReplays = () => [
  replay({
    uploaderUserId: BB.users.bravo,
    accountId: BB.alpha,
    tankId: 11,
    arenaUniqueId: 202n,
    damageDealt: 9500,
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    uploaderUserId: BB.users.alpha,
    accountId: BB.alpha,
    tankId: 11,
    arenaUniqueId: 203n,
    damageDealt: 9600,
    visibility: 'private',
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    uploaderUserId: BB.users.alpha,
    accountId: BB.alpha,
    tankId: 11,
    arenaUniqueId: 204n,
    damageDealt: 9700,
    status: 'failed',
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    uploaderUserId: BB.users.hidden,
    accountId: BB.hidden,
    tankId: 11,
    arenaUniqueId: 205n,
    damageDealt: 9800,
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    id: BB.replays.r8,
    uploaderUserId: BB.users.bravo,
    accountId: BB.alpha,
    tankId: 12,
    arenaUniqueId: 108n,
    arenaId: 'map_b',
    damageDealt: 2000,
    playedAt: at('2026-10-05T08:00:00')
  }),
  replay({
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 11,
    arenaUniqueId: 206n,
    damageDealt: 9900,
    battleType: '7',
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: null,
    arenaUniqueId: 207n,
    damageDealt: 9950,
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 11,
    arenaUniqueId: 210n,
    damageDealt: 9991,
    visibility: 'unlisted',
    playedAt: at('2026-10-04T15:00:00')
  }),
  replay({
    uploaderUserId: BB.users.bravo,
    accountId: BB.bravo,
    tankId: 13,
    arenaUniqueId: 105n,
    damageDealt: 3000,
    visibility: 'private',
    playedAt: at('2026-09-30T12:00:00')
  })
];

export const seedBestBattles = async (prisma: TestPrisma) => {
  await seedReference(prisma);
  await seedAccounts(prisma);
  await seedBattles(prisma);
  await prisma.replay.createMany({ data: [...visibleReplays(), ...excludedReplays()] });
};
