import { addHours, subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import type { Prisma } from '../../../../../generated';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { MAP_STATS } from '../../config/map-stats.constants';
import { MapStatsAggregateService } from '../map-stats-aggregate.service';

const SEED = {
  now: new Date('2026-10-05T12:00:00Z'),
  noonMoscow: new Date('2026-10-04T09:00:00Z'),
  midnightMoscow: new Date('2026-10-03T21:00:00Z'),
  accounts: [3_000_000_001n, 3_000_000_002n],
  tier5: 1,
  tier8: 2,
  unknownTank: 9,
  arena: '05_prohorovka',
  otherArena: '01_karelia',
  random: '1',
  epicRandom: '24',
  ranked: '22',
  unmapped: '7'
} as const;

const [first, second] = SEED.accounts;

const battle = (
  input: Partial<Prisma.BattleCreateManyInput> & Pick<Prisma.BattleCreateManyInput, 'accountId' | 'arenaUniqueId'>
): Prisma.BattleCreateManyInput => ({
  tankId: SEED.tier5,
  arenaId: SEED.arena,
  battleType: SEED.random,
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
  achievements: [],
  startedAt: SEED.noonMoscow,
  ...input
});

const replay = (input: Partial<Prisma.ReplayCreateManyInput> & Pick<Prisma.ReplayCreateManyInput, 'sha256'>): Prisma.ReplayCreateManyInput => ({
  storageKey: `replays/${input.sha256}`,
  fileName: `${input.sha256}.mtreplay`,
  fileSize: 1,
  status: 'parsed',
  arenaId: SEED.arena,
  tankId: SEED.tier5,
  battleType: SEED.random,
  playedAt: SEED.noonMoscow,
  medals: [],
  playerAccountIds: [],
  ...input
});

const vehicle = (tankId: number, tier: number): Prisma.VehicleCreateManyInput => ({
  tankId,
  tier,
  name: `tank-${tankId}`,
  shortName: `t${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'mediumTank'
});

const rotationRow = (row: Omit<Prisma.MapRotationAggregateCreateManyInput, 'computedAt' | 'windowDays'>) => ({
  ...row,
  windowDays: MAP_STATS.windowDays,
  computedAt: SEED.now
});

const queueRow = (row: Omit<Prisma.QueueTimeAggregateCreateManyInput, 'computedAt' | 'windowDays'>) => ({
  ...row,
  windowDays: MAP_STATS.windowDays,
  computedAt: SEED.now
});

describeWithDatabase('MapStatsAggregateService.compute', () => {
  const prisma = createTestPrisma();
  const service = new MapStatsAggregateService(prisma);

  const seed = async () => {
    await prisma.player.createMany({ data: [first, second].map((accountId) => ({ accountId, nickname: `player-${accountId}` })) });
    await prisma.vehicle.createMany({ data: [vehicle(SEED.tier5, 5), vehicle(SEED.tier8, 8)] });

    await prisma.battle.createMany({
      data: [
        battle({ accountId: first, arenaUniqueId: 100n, queueTimeMs: 10_000 }),
        battle({ accountId: second, arenaUniqueId: 100n, tankId: SEED.tier8, queueTimeMs: 20_000 }),
        battle({ accountId: first, arenaUniqueId: 101n, battleType: SEED.epicRandom, startedAt: SEED.midnightMoscow, queueTimeMs: 30_000 }),
        battle({ accountId: first, arenaUniqueId: 102n, arenaId: SEED.otherArena, battleType: SEED.ranked }),
        battle({ accountId: first, arenaUniqueId: 103n, battleType: SEED.unmapped, queueTimeMs: 5_000 }),
        battle({ accountId: first, arenaUniqueId: 104n, startedAt: subDays(SEED.now, MAP_STATS.windowDays + 1), queueTimeMs: 5_000 }),
        battle({ accountId: first, arenaUniqueId: 105n, startedAt: addHours(SEED.now, 1), queueTimeMs: 5_000 }),
        battle({ accountId: first, arenaUniqueId: 106n, arenaId: SEED.otherArena, tankId: SEED.tier8, queueTimeMs: 30_000 }),
        battle({ accountId: first, arenaUniqueId: 107n, tankId: SEED.unknownTank, queueTimeMs: 5_000 })
      ]
    });

    await prisma.replay.createMany({
      data: [
        replay({ sha256: 'same-battle', arenaUniqueId: 100n }),
        replay({ sha256: 'ranked', arenaUniqueId: 200n, arenaId: SEED.otherArena, tankId: SEED.tier8, battleType: SEED.ranked }),
        replay({ sha256: 'unparsed', arenaUniqueId: 201n, status: 'uploaded' }),
        replay({ sha256: 'no-battle-id', arenaUniqueId: null }),
        replay({ sha256: 'no-arena', arenaUniqueId: 202n, arenaId: null }),
        replay({ sha256: 'old', arenaUniqueId: 203n, playedAt: subDays(SEED.now, MAP_STATS.windowDays + 1) }),
        replay({ sha256: 'unknown-tank', arenaUniqueId: 204n, tankId: SEED.unknownTank }),
        replay({ sha256: 'unmapped', arenaUniqueId: 205n, battleType: SEED.unmapped })
      ]
    });

    await prisma.mapRotationAggregate.create({ data: rotationRow({ arenaId: 'stale', tier: 1, mode: 'random', battles: 9, share: 100 }) });
    await prisma.queueTimeAggregate.create({ data: queueRow({ tier: 1, hour: 3, mode: 'random', samples: 9, avgSec: 1, medianSec: 1, p90Sec: 1 }) });
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'replay', 'player', 'vehicle', 'map_rotation_aggregate', 'queue_time_aggregate'] });
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reports how many rows it wrote', async () => {
    const result = await service.compute(SEED.now);

    expect(result).toEqual({ rotation: 8, queue: 5 });
  });

  it('replaces the rotation with distinct battles per map, tier and mode, split by source, with shares per tier and mode', async () => {
    await service.compute(SEED.now);

    const rows = await prisma.mapRotationAggregate.findMany({ orderBy: [{ mode: 'asc' }, { tier: 'asc' }, { arenaId: 'asc' }] });

    expect(rows).toEqual([
      rotationRow({ arenaId: SEED.otherArena, tier: 0, mode: 'random', battles: 1, share: 100 / 3, modBattles: 1, replayBattles: 0 }),
      rotationRow({ arenaId: SEED.arena, tier: 0, mode: 'random', battles: 2, share: 200 / 3, modBattles: 2, replayBattles: 1 }),
      rotationRow({ arenaId: SEED.arena, tier: 5, mode: 'random', battles: 2, share: 100, modBattles: 2, replayBattles: 1 }),
      rotationRow({ arenaId: SEED.otherArena, tier: 8, mode: 'random', battles: 1, share: 50, modBattles: 1, replayBattles: 0 }),
      rotationRow({ arenaId: SEED.arena, tier: 8, mode: 'random', battles: 1, share: 50, modBattles: 1, replayBattles: 0 }),
      rotationRow({ arenaId: SEED.otherArena, tier: 0, mode: 'ranked', battles: 2, share: 100, modBattles: 1, replayBattles: 1 }),
      rotationRow({ arenaId: SEED.otherArena, tier: 5, mode: 'ranked', battles: 1, share: 100, modBattles: 1, replayBattles: 0 }),
      rotationRow({ arenaId: SEED.otherArena, tier: 8, mode: 'ranked', battles: 1, share: 100, modBattles: 0, replayBattles: 1 })
    ]);
  });

  it('replaces the queue times with waits per Moscow hour, per tier and across tiers', async () => {
    await service.compute(SEED.now);

    const rows = await prisma.queueTimeAggregate.findMany({ orderBy: [{ mode: 'asc' }, { tier: 'asc' }, { hour: 'asc' }] });

    expect(rows).toEqual([
      queueRow({ tier: 0, hour: 0, mode: 'random', samples: 1, avgSec: 30, medianSec: 30, p90Sec: 30 }),
      queueRow({ tier: 0, hour: 12, mode: 'random', samples: 3, avgSec: 20, medianSec: 20, p90Sec: 28 }),
      queueRow({ tier: 5, hour: 0, mode: 'random', samples: 1, avgSec: 30, medianSec: 30, p90Sec: 30 }),
      queueRow({ tier: 5, hour: 12, mode: 'random', samples: 1, avgSec: 10, medianSec: 10, p90Sec: 10 }),
      queueRow({ tier: 8, hour: 12, mode: 'random', samples: 2, avgSec: 25, medianSec: 25, p90Sec: 29 })
    ]);
  });
});
