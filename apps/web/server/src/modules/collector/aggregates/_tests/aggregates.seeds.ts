import type { Prisma } from '../../../../../generated';

const SNAPSHOT_TOTALS = {
  wins: 0,
  losses: 0,
  draws: 0,
  damageDealt: 0,
  damageReceived: 0,
  frags: 0,
  spotted: 0,
  xp: 0,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0,
  avgDamageBlocked: 0
} as const;

export const playerSeed = (accountId: bigint, data: Partial<Prisma.PlayerCreateManyInput> = {}): Prisma.PlayerCreateManyInput => ({
  accountId,
  nickname: `player-${accountId}`,
  ...data
});

export const battleSeed = (
  data: Partial<Prisma.BattleCreateManyInput> & Pick<Prisma.BattleCreateManyInput, 'accountId' | 'arenaUniqueId' | 'tankId'>
): Prisma.BattleCreateManyInput => ({
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
  survived: false,
  achievements: [],
  startedAt: new Date(),
  ...data
});

export const replaySeed = (
  data: Partial<Prisma.ReplayCreateManyInput> & Pick<Prisma.ReplayCreateManyInput, 'sha256'>
): Prisma.ReplayCreateManyInput => ({
  storageKey: `replay-${data.sha256}`,
  fileName: `${data.sha256}.mtreplay`,
  fileSize: 1,
  status: 'parsed',
  battleType: '1',
  playerAccountIds: [],
  medals: [],
  playedAt: new Date(),
  ...data
});

export const accountSnapshotSeed = (
  data: Partial<Prisma.AccountSnapshotCreateManyInput> & Pick<Prisma.AccountSnapshotCreateManyInput, 'accountId' | 'battles' | 'capturedAt'>
): Prisma.AccountSnapshotCreateManyInput => ({ mode: 'random', ...SNAPSHOT_TOTALS, ...data });

export const tankSnapshotSeed = (
  data: Partial<Prisma.TankSnapshotCreateManyInput> & Pick<Prisma.TankSnapshotCreateManyInput, 'accountId' | 'battles' | 'capturedAt' | 'tankId'>
): Prisma.TankSnapshotCreateManyInput => ({ mode: 'random', markOfMastery: 0, ...SNAPSHOT_TOTALS, ...data });

export const tankSnapshotLatestSeed = (
  data: Partial<Prisma.TankSnapshotLatestCreateManyInput> &
    Pick<Prisma.TankSnapshotLatestCreateManyInput, 'accountId' | 'battles' | 'capturedAt' | 'tankId'>
): Prisma.TankSnapshotLatestCreateManyInput => ({ mode: 'random', markOfMastery: 0, ...SNAPSHOT_TOTALS, ...data });

export const tankBattleDeltaSeed = (
  data: Partial<Prisma.TankBattleDeltaCreateManyInput> &
    Pick<Prisma.TankBattleDeltaCreateManyInput, 'accountId' | 'battles' | 'capturedAt' | 'tankId'>
): Prisma.TankBattleDeltaCreateManyInput => ({
  mode: 'random',
  cohort: 'average',
  accountWinRate: 50,
  wins: 0,
  damageDealt: 0,
  damageBlocked: 0,
  frags: 0,
  spotted: 0,
  xp: 0,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0,
  ...data
});
