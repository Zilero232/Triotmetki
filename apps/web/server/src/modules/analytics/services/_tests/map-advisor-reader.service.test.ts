import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Arena } from '../../../../../generated';
import type { AnalyticsQueries } from '../../providers/analytics-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { ExpectedValuesService, VehicleCatalogService } from '../../../reference';
import { MAP_ADVISOR } from '../../config';
import { MapAdvisorReaderService } from '../map-advisor-reader.service';
import { OwnAccountService } from '../own-account.service';
import { catalogOf, rawRow, vehicle } from './analytics.fixtures';

const heavy = vehicle({ tankId: 1, type: 'heavyTank' });
const light = vehicle({ tankId: 2, type: 'lightTank' });

type MapRow = Awaited<ReturnType<AnalyticsQueries['mapStats']>>[number];

const mapRow = (fields: { arena: string; tankId: number; team: number | null; battles: number; wins: number }): MapRow => ({
  ...rawRow({ tank_id: fields.tankId, battles: fields.battles, wins: fields.wins }),
  arena_id: fields.arena,
  team: fields.team
});

const arena = (arenaId: string, name: string) => Object.assign(mock<Arena>(), { arenaId, name });

const setup = (rows: MapRow[]) => {
  const prisma = mockPrismaService();
  const queries = mock<AnalyticsQueries>();
  const catalog = mock<VehicleCatalogService>();
  const expected = mock<ExpectedValuesService>();
  const accounts = mock<OwnAccountService>();

  accounts.resolve.mockResolvedValue(7n);
  expected.all.mockResolvedValue(new Map());
  catalog.all.mockResolvedValue(catalogOf(heavy, light));
  queries.mapStats.mockResolvedValue(rows);
  prisma.arena.findMany.mockResolvedValue([arena('himmelsdorf', 'Himmelsdorf')]);

  return { service: new MapAdvisorReaderService(prisma, catalog, expected, accounts, queries) };
};

describe('MapAdvisorReaderService.maps', () => {
  it('returns empty lists without battles', async () => {
    const { service } = setup([]);

    expect(await service.maps({ userId: 'u', period: 'd30' })).toMatchObject({
      totals: { battles: 0, winRate: null },
      maps: [],
      rows: [],
      weakMaps: [],
      strongMaps: []
    });
  });

  it('merges every tank and team into one line per map, busiest map first', async () => {
    const { service } = setup([
      mapRow({ arena: 'himmelsdorf', tankId: heavy.tankId, team: 1, battles: 3, wins: 1 }),
      mapRow({ arena: 'prokhorovka', tankId: heavy.tankId, team: 1, battles: 2, wins: 1 }),
      mapRow({ arena: 'himmelsdorf', tankId: light.tankId, team: 2, battles: 4, wins: 2 })
    ]);

    const { maps, totals } = await service.maps({ userId: 'u', period: 'd30' });

    expect(maps.map((map) => [map.arenaId, map.battles])).toEqual([
      ['himmelsdorf', 7],
      ['prokhorovka', 2]
    ]);

    expect(maps.map((map) => map.name)).toEqual(['Himmelsdorf', null]);
    expect(totals.battles).toBe(9);
  });

  it('breaks each map down by vehicle class and spawn team', async () => {
    const { service } = setup([
      mapRow({ arena: 'himmelsdorf', tankId: heavy.tankId, team: 1, battles: 3, wins: 1 }),
      mapRow({ arena: 'himmelsdorf', tankId: heavy.tankId, team: 2, battles: 1, wins: 1 }),
      mapRow({ arena: 'himmelsdorf', tankId: 999, team: 1, battles: 2, wins: 0 })
    ]);

    const { rows } = await service.maps({ userId: 'u', period: 'd30' });

    expect(rows.map((row) => [row.vehicleClass, row.team, row.battles])).toEqual([
      ['heavyTank', 1, 3],
      [null, 1, 2],
      ['heavyTank', 2, 1]
    ]);
  });

  it('highlights a well-played map as strong and a badly played one as weak', async () => {
    const battles = MAP_ADVISOR.minMapBattles;
    const { service } = setup([
      mapRow({ arena: 'good', tankId: heavy.tankId, team: 1, battles, wins: battles }),
      mapRow({ arena: 'bad', tankId: heavy.tankId, team: 1, battles, wins: 0 }),
      mapRow({ arena: 'rare', tankId: heavy.tankId, team: 1, battles: battles - 1, wins: 0 })
    ]);

    const result = await service.maps({ userId: 'u', period: 'd30' });

    expect(result.strongMaps).toEqual(['good']);
    expect(result.weakMaps).toEqual(['bad']);
    expect(result.maps.find((map) => map.arenaId === 'good')?.winRateDelta).toBeGreaterThan(0);
  });
});
