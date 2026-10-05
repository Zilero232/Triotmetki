import { TANK_MAPS } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { VehicleCatalogService } from '../../../reference';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { unknownVehicle } from '../../../reference';
import { TankMapStatsReaderService } from '../tank-map-stats-reader.service';
import { arena, battle, MAPS_SEED, replay } from './maps.fixtures';

const [first, second, third] = MAPS_SEED.accounts;
const unknownArena = '99_unknown';
const thirdTankId = 3;
const tooOld = subDays(new Date(), TANK_MAPS.windowDays + 1);

const enoughBattles = Array.from({ length: TANK_MAPS.minBattles }, (_, index) =>
  battle({ accountId: first, arenaUniqueId: BigInt(1_000 + index), result: index < 20 ? 'win' : 'loss', damageDealt: 1_000 + index * 100 })
);

describeWithDatabase('TankMapStatsReaderService', () => {
  const prisma = createTestPrisma();
  const catalog = mock<VehicleCatalogService>();
  const service = new TankMapStatsReaderService(prisma, catalog);

  const seed = async () => {
    await prisma.battle.createMany({
      data: [
        ...enoughBattles,
        battle({ accountId: first, arenaUniqueId: 300n, arenaId: MAPS_SEED.otherArena, result: 'loss', damageDealt: 1_000 }),
        battle({ accountId: first, arenaUniqueId: 310n, arenaId: MAPS_SEED.otherArena, startedAt: tooOld }),
        battle({ accountId: first, arenaUniqueId: 311n, arenaId: MAPS_SEED.otherArena, battleType: MAPS_SEED.ranked }),
        battle({ accountId: third, arenaUniqueId: 400n, arenaId: unknownArena }),
        battle({ accountId: third, arenaUniqueId: 401n, arenaId: unknownArena }),
        battle({ accountId: third, arenaUniqueId: 402n, arenaId: unknownArena, result: 'loss' }),
        battle({ accountId: second, arenaUniqueId: 500n, tankId: MAPS_SEED.otherTankId, damageDealt: 500 }),
        battle({ accountId: second, arenaUniqueId: 501n, tankId: MAPS_SEED.otherTankId, result: 'loss', damageDealt: 700 }),
        battle({ accountId: second, arenaUniqueId: 502n, tankId: thirdTankId }),
        battle({ accountId: second, arenaUniqueId: 503n, tankId: thirdTankId })
      ]
    });

    await prisma.replay.createMany({
      data: [
        replay({ sha256: 'own-battle', accountId: first, arenaUniqueId: 300n, arenaId: MAPS_SEED.otherArena, result: 'win', damageDealt: 9_000 }),
        replay({ sha256: 'kept', accountId: second, arenaUniqueId: 301n, arenaId: MAPS_SEED.otherArena, damageDealt: 3_000 }),
        replay({ sha256: 'kept-twice', accountId: second, arenaUniqueId: 301n, arenaId: MAPS_SEED.otherArena, damageDealt: 3_000 }),
        replay({
          sha256: 'unlisted',
          accountId: second,
          arenaUniqueId: 302n,
          arenaId: MAPS_SEED.otherArena,
          visibility: 'unlisted',
          damageDealt: 2_000
        }),
        replay({ sha256: 'private', accountId: second, arenaUniqueId: 303n, arenaId: MAPS_SEED.otherArena, visibility: 'private' }),
        replay({ sha256: 'ranked', accountId: second, arenaUniqueId: 304n, arenaId: MAPS_SEED.otherArena, battleType: MAPS_SEED.ranked }),
        replay({ sha256: 'old', accountId: second, arenaUniqueId: 305n, arenaId: MAPS_SEED.otherArena, playedAt: tooOld }),
        replay({ sha256: 'no-damage', accountId: second, arenaUniqueId: 306n, arenaId: MAPS_SEED.otherArena, damageDealt: null }),
        replay({ sha256: 'no-result', accountId: second, arenaUniqueId: 307n, arenaId: MAPS_SEED.otherArena, result: null }),
        replay({ sha256: 'no-account', accountId: null, arenaUniqueId: 308n, arenaId: MAPS_SEED.otherArena }),
        replay({ sha256: 'unparsed', accountId: second, arenaUniqueId: 309n, arenaId: MAPS_SEED.otherArena, status: 'uploaded' })
      ]
    });
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'replay', 'player', 'arena'] });
    await prisma.player.createMany({ data: [first, second, third].map((accountId) => ({ accountId, nickname: `player-${accountId}` })) });
    await prisma.arena.createMany({ data: [arena(MAPS_SEED.arena, MAPS_SEED.slug), arena(MAPS_SEED.otherArena, MAPS_SEED.otherSlug)] });
    catalog.summary.mockImplementation(async (tankId) => unknownVehicle(tankId));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('samples a tank per map from battles and the parsed replays no battle covers, most played first', async () => {
    await seed();

    const result = await service.forTank(MAPS_SEED.tankId);

    expect(result).toEqual({
      tankId: MAPS_SEED.tankId,
      windowDays: TANK_MAPS.windowDays,
      minBattles: TANK_MAPS.minBattles,
      battles: TANK_MAPS.minBattles + 6,
      maps: [
        {
          map: { arenaId: MAPS_SEED.arena, slug: MAPS_SEED.slug, name: 'name-prohorovka', nameEn: 'en-prohorovka', image: null },
          battles: TANK_MAPS.minBattles,
          isEnough: true,
          winRate: (20 * 100) / 30,
          avgDamage: 2_450
        },
        {
          map: { arenaId: MAPS_SEED.otherArena, slug: MAPS_SEED.otherSlug, name: 'name-karelia', nameEn: 'en-karelia', image: null },
          battles: 3,
          isEnough: false,
          winRate: null,
          avgDamage: null
        },
        {
          map: { arenaId: unknownArena, slug: unknownArena, name: unknownArena, nameEn: null, image: null },
          battles: 3,
          isEnough: false,
          winRate: null,
          avgDamage: null
        }
      ]
    });
  });

  it('answers an empty window for a tank nobody played', async () => {
    await seed();

    const result = await service.forTank(99);

    expect(result).toEqual({ tankId: 99, windowDays: TANK_MAPS.windowDays, minBattles: TANK_MAPS.minBattles, battles: 0, maps: [] });
  });

  it('samples a map per tank, most played first and ties by tank id', async () => {
    await seed();

    const result = await service.forMap(MAPS_SEED.slug);

    expect(result).toEqual({
      arenaId: MAPS_SEED.arena,
      windowDays: TANK_MAPS.windowDays,
      minBattles: TANK_MAPS.minBattles,
      battles: TANK_MAPS.minBattles + 4,
      tanks: [
        { vehicle: unknownVehicle(MAPS_SEED.tankId), battles: TANK_MAPS.minBattles, isEnough: true, winRate: (20 * 100) / 30, avgDamage: 2_450 },
        { vehicle: unknownVehicle(MAPS_SEED.otherTankId), battles: 2, isEnough: false, winRate: null, avgDamage: null },
        { vehicle: unknownVehicle(thirdTankId), battles: 2, isEnough: false, winRate: null, avgDamage: null }
      ]
    });
  });

  it('counts the replays of a map like its battles', async () => {
    await seed();

    const result = await service.forMap(MAPS_SEED.otherArena);

    expect(result.tanks.map(({ vehicle, battles }) => ({ tankId: vehicle.tankId, battles }))).toEqual([{ tankId: MAPS_SEED.tankId, battles: 3 }]);
  });
});
