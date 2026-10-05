import type { Prisma } from '../../../../../generated';

export const MAPS_SEED = {
  accounts: [2_000_000_001n, 2_000_000_002n, 2_000_000_003n],
  arena: '05_prohorovka',
  slug: 'prohorovka',
  otherArena: '01_karelia',
  otherSlug: 'karelia',
  tankId: 1,
  otherTankId: 2,
  randomBattleType: '1',
  ranked: '22'
} as const;

export const arena = (arenaId: string, slug: string): Prisma.ArenaCreateManyInput => ({
  arenaId,
  slug,
  name: `name-${slug}`,
  nameEn: `en-${slug}`,
  modes: ['ctf']
});

export const battle = (
  input: Partial<Prisma.BattleCreateManyInput> & Pick<Prisma.BattleCreateManyInput, 'accountId' | 'arenaUniqueId'>
): Prisma.BattleCreateManyInput => ({
  tankId: MAPS_SEED.tankId,
  arenaId: MAPS_SEED.arena,
  battleType: MAPS_SEED.randomBattleType,
  result: 'win',
  team: 1,
  damageDealt: 1_000,
  damageAssistedRadio: 0,
  damageAssistedTrack: 0,
  damageAssistedStun: 0,
  damageBlocked: 0,
  damageReceived: 0,
  spotted: 0,
  frags: 0,
  xp: 0,
  survived: true,
  achievements: [],
  startedAt: new Date(),
  ...input
});

export const replay = (
  input: Partial<Prisma.ReplayCreateManyInput> & Pick<Prisma.ReplayCreateManyInput, 'sha256'>
): Prisma.ReplayCreateManyInput => ({
  storageKey: `replays/${input.sha256}`,
  fileName: `${input.sha256}.mtreplay`,
  fileSize: 1,
  status: 'parsed',
  arenaId: MAPS_SEED.arena,
  tankId: MAPS_SEED.tankId,
  battleType: MAPS_SEED.randomBattleType,
  result: 'win',
  damageDealt: 1_000,
  playedAt: new Date(),
  medals: [],
  playerAccountIds: [],
  ...input
});
