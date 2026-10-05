import type { Prisma } from '../../../../../../generated';

export const PURGE_SEED = {
  purged: 1_000_000_005n,
  kept: 1_000_000_006n,
  stranger: 1_000_000_007n,
  clanId: 500_001n,
  tankId: 1,
  capturedAt: new Date('2026-10-01T10:00:00Z'),
  day: new Date('2026-10-01T00:00:00Z'),
  weekStart: new Date('2026-09-28T00:00:00Z')
} as const;

export const accountSnapshot = (accountId: bigint): Prisma.AccountSnapshotCreateManyInput => ({
  accountId,
  mode: 'random',
  capturedAt: PURGE_SEED.capturedAt,
  battles: 10,
  wins: 5,
  losses: 5,
  draws: 0,
  damageDealt: 10_000n,
  damageReceived: 9_000n,
  frags: 7,
  spotted: 6,
  xp: 5_000n,
  survived: 3,
  hits: 70,
  shots: 100,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 100
});

export const tankSnapshot = (accountId: bigint): Prisma.TankSnapshotCreateManyInput => ({
  accountId,
  tankId: PURGE_SEED.tankId,
  mode: 'random',
  capturedAt: PURGE_SEED.capturedAt,
  battles: 10,
  wins: 5,
  losses: 5,
  draws: 0,
  damageDealt: 10_000,
  damageReceived: 9_000,
  frags: 7,
  spotted: 6,
  xp: 5_000,
  survived: 3,
  hits: 70,
  shots: 100,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 100,
  markOfMastery: 0
});

export const tankBattleDelta = (accountId: bigint): Prisma.TankBattleDeltaCreateManyInput => ({
  accountId,
  tankId: PURGE_SEED.tankId,
  mode: 'random',
  capturedAt: PURGE_SEED.capturedAt,
  cohort: 'average',
  accountWinRate: 50,
  battles: 1,
  wins: 1,
  damageDealt: 1_000,
  damageBlocked: 0,
  frags: 1,
  spotted: 1,
  xp: 500,
  survived: 1,
  hits: 7,
  shots: 10,
  capturePoints: 0,
  droppedCapturePoints: 0
});

export const summaryPlayer = (accountId: bigint | null, name: string) => ({
  accountId: accountId === null ? null : Number(accountId),
  name,
  clanTag: 'TAG',
  tankId: PURGE_SEED.tankId,
  team: 1
});

export const replay = (key: string, data: Partial<Prisma.ReplayCreateManyInput> = {}): Prisma.ReplayCreateManyInput => ({
  storageKey: `replays/${key}.mtreplay`,
  fileName: `${key}.mtreplay`,
  fileSize: 1,
  sha256: `sha-${key}`,
  playerAccountIds: [],
  ...data
});

export const rngDaily = (scope: string, players: bigint[]): Prisma.RngDailyCreateManyInput => ({
  day: PURGE_SEED.day,
  scope,
  battles: 1,
  shots: 1,
  damage: 1,
  nominal: 1,
  within: 1,
  bucketShots: [1],
  fired: 1,
  hit: 1,
  pierced: 1,
  players
});
