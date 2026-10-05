import { TANK_MAPS } from '@otmetki/schemas';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Arena } from '../../../../../generated';
import type { VehicleCatalogService } from '../../../reference';
import type { MapSamplesQueries } from '../../queries/map-samples.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { unknownVehicle } from '../../../reference';
import { TankMapStatsReaderService } from '../tank-map-stats-reader.service';

const createService = () => {
  const prisma = mockPrismaService();
  const catalog = mock<VehicleCatalogService>();
  const queries = { mapSamples: vi.fn<MapSamplesQueries['mapSamples']>() };

  catalog.summary.mockImplementation(async (tankId) => unknownVehicle(tankId));
  queries.mapSamples.mockResolvedValue([]);

  return { prisma, queries, service: new TankMapStatsReaderService(prisma, catalog, queries) };
};

describe('TankMapStatsReaderService.forTank', () => {
  it('names every map it knows and falls back to the arena id for one it does not', async () => {
    const { prisma, queries, service } = createService();

    queries.mapSamples.mockResolvedValue([
      { key: '05_prohorovka', battles: TANK_MAPS.minBattles, wins: 20, avgDamage: 3_000 },
      { key: '99_unknown', battles: 3, wins: 1, avgDamage: 1_000 }
    ]);

    prisma.arena.findMany.mockResolvedValue([
      mock<Arena>({ arenaId: '05_prohorovka', slug: 'prohorovka', name: 'Прохоровка', nameEn: 'Prokhorovka', image: null })
    ]);

    const maps = await service.forTank(1);

    expect(maps.battles).toBe(TANK_MAPS.minBattles + 3);
    expect(maps.maps.map(({ map }) => map.name)).toEqual(['Прохоровка', '99_unknown']);
    expect(maps.maps[1]).toMatchObject({ battles: 3, isEnough: false, winRate: null, avgDamage: null });
  });

  it('answers an empty window when there are no battles', async () => {
    const { prisma, service } = createService();

    prisma.arena.findMany.mockResolvedValue([]);

    await expect(service.forTank(1)).resolves.toMatchObject({ battles: 0, maps: [], minBattles: TANK_MAPS.minBattles });
  });
});

describe('TankMapStatsReaderService.forMap', () => {
  it('refuses an unknown map', async () => {
    const { prisma, service } = createService();

    prisma.arena.findFirst.mockResolvedValue(null);

    await expect(service.forMap('nowhere')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('lists the tanks played on the map with their catalog summary', async () => {
    const { prisma, queries, service } = createService();

    prisma.arena.findFirst.mockResolvedValue(mock<Arena>({ arenaId: '05_prohorovka' }));
    queries.mapSamples.mockResolvedValue([{ key: '7', battles: TANK_MAPS.minBattles, wins: TANK_MAPS.minBattles, avgDamage: 2_000 }]);

    const map = await service.forMap('prohorovka');

    expect(map.arenaId).toBe('05_prohorovka');
    expect(map.tanks[0]?.vehicle.tankId).toBe(7);
    expect(map.tanks[0]?.winRate).toBeCloseTo(100);
  });
});
