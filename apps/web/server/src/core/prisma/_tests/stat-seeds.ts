import type { Prisma } from '../../../../generated';

export const STAT_SEED = {
  accountId: 1_000_000_001n,
  mateId: 1_000_000_002n,
  tankId: 1,
  otherTankId: 2
} as const;

export const battleRow = (overrides: Partial<Prisma.BattleCreateManyInput> & Pick<Prisma.BattleCreateManyInput, 'arenaUniqueId' | 'startedAt'>) =>
  ({
    accountId: STAT_SEED.accountId,
    tankId: STAT_SEED.tankId,
    arenaId: 'map_a',
    battleType: '1',
    result: 'win',
    damageDealt: 1000,
    damageAssistedRadio: 100,
    damageAssistedTrack: 200,
    damageAssistedStun: 50,
    damageBlocked: 300,
    damageReceived: 400,
    spotted: 1,
    frags: 1,
    xp: 500,
    survived: true,
    ...overrides
  }) satisfies Prisma.BattleCreateManyInput;

export const tankDeltaRow = (overrides: Partial<Prisma.TankBattleDeltaCreateManyInput> & Pick<Prisma.TankBattleDeltaCreateManyInput, 'capturedAt'>) =>
  ({
    accountId: STAT_SEED.accountId,
    tankId: STAT_SEED.tankId,
    mode: 'random',
    cohort: 'average',
    accountWinRate: 50,
    battles: 2,
    wins: 1,
    damageDealt: 2000,
    damageBlocked: 100,
    frags: 2,
    spotted: 3,
    xp: 900,
    survived: 1,
    hits: 10,
    shots: 12,
    capturePoints: 4,
    droppedCapturePoints: 5,
    ...overrides
  }) satisfies Prisma.TankBattleDeltaCreateManyInput;
