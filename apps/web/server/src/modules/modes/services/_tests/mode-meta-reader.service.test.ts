import type { VehicleSummary } from '@otmetki/schemas';

import { MODE_META, PLAY_MODES } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { GameEvent, ModeTankAggregate } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CatalogEntry, VehicleCatalogService } from '../../../reference';

import { ModeMetaReaderService } from '../mode-meta-reader.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const summary = (tankId: number): VehicleSummary => ({
  tankId,
  name: `Tank ${tankId}`,
  shortName: `T${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'mediumTank',
  tier: 8,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
});

const entry = (tankId: number): CatalogEntry => ({
  summary: summary(tankId),
  dbType: 'mediumTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const aggregate = (overrides: Pick<ModeTankAggregate, 'tankId'> & Partial<ModeTankAggregate>): ModeTankAggregate => ({
  mode: 'onslaught',
  battles: 100,
  players: 20,
  wins: 50,
  decided: 100,
  winRate: 50,
  avgDamage: 2_000,
  avgXp: 800,
  avgFrags: 1,
  survivalRate: 30,
  modBattles: 0,
  replayBattles: 0,
  windowDays: 14,
  computedAt: new Date('2026-09-25T00:00:00Z'),
  ...overrides
});

const event = (overrides: Partial<GameEvent>): GameEvent => ({
  id: 'e1',
  slug: 'season',
  kind: 'onslaught',
  title: 'Season',
  description: null,
  url: null,
  image: null,
  data: null,
  startsAt: new Date('2026-09-01T00:00:00Z'),
  endsAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides
});

const query = { minBattles: 20 };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();

  prisma.modeTankAggregate.findMany.mockResolvedValue([]);
  prisma.gameEvent.findFirst.mockResolvedValue(null);
  catalog.filter.mockResolvedValue([entry(1), entry(2), entry(3)]);
  catalog.summary.mockImplementation(async (tankId) => summary(tankId));

  return { service: new ModeMetaReaderService(prisma, catalog), prisma, catalog };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ModeMetaReaderService.meta', () => {
  it('reads the mode totals from the total row and keeps it out of the tanks', async () => {
    const { service, prisma } = createService();

    prisma.modeTankAggregate.findMany.mockResolvedValue([
      aggregate({ tankId: MODE_META.totalTankId, battles: 5_000, players: 900, winRate: 49 }),
      aggregate({ tankId: 1 })
    ]);

    const meta = await service.meta({ mode: 'onslaught', query });

    expect(meta).toMatchObject({ battles: 5_000, players: 900, winRate: 49, windowDays: 14 });
    expect(meta.tanks.map((tank) => tank.vehicle.tankId)).toEqual([1]);
  });

  it('reports zero totals and the default window when no total row exists', async () => {
    const { service } = createService();

    const meta = await service.meta({ mode: 'onslaught', query });

    expect(meta).toMatchObject({ battles: 0, players: 0, winRate: null, windowDays: MODE_META.windowDays, computedAt: null, tanks: [] });
  });

  it('drops tanks the vehicle filter excludes', async () => {
    const { service, prisma } = createService();

    prisma.modeTankAggregate.findMany.mockResolvedValue([aggregate({ tankId: 1 }), aggregate({ tankId: 9 })]);

    const meta = await service.meta({ mode: 'onslaught', query });

    expect(meta.tanks.map((tank) => tank.vehicle.tankId)).toEqual([1]);
  });

  it('orders ranked tanks by score and puts tanks below the sample after them by battles', async () => {
    const { service, prisma } = createService();

    prisma.modeTankAggregate.findMany.mockResolvedValue([
      aggregate({ tankId: 1, wins: 40, decided: 100 }),
      aggregate({ tankId: 2, wins: 70, decided: 100 }),
      aggregate({ tankId: 3, battles: query.minBattles - 1, wins: 19, decided: 19 })
    ]);

    const { tanks } = await service.meta({ mode: 'onslaught', query });

    expect(tanks.map((tank) => tank.vehicle.tankId)).toEqual([2, 1, 3]);
    expect(tanks[2]).toMatchObject({ rank: null, score: null });
  });

  it('stamps the newest computation time', async () => {
    const { service, prisma } = createService();

    prisma.modeTankAggregate.findMany.mockResolvedValue([
      aggregate({ tankId: 1, computedAt: new Date('2026-09-20T00:00:00Z') }),
      aggregate({ tankId: 2, computedAt: new Date('2026-09-24T00:00:00Z') })
    ]);

    expect((await service.meta({ mode: 'onslaught', query })).computedAt).toBe('2026-09-24T00:00:00.000Z');
  });

  it('shows the running season', async () => {
    const { service, prisma } = createService();

    prisma.gameEvent.findFirst.mockResolvedValueOnce(event({ title: 'Running', endsAt: new Date('2026-10-01T00:00:00Z') }));

    expect((await service.meta({ mode: 'onslaught', query })).season).toEqual({
      title: 'Running',
      url: null,
      startsAt: '2026-09-01T00:00:00.000Z',
      endsAt: '2026-10-01T00:00:00.000Z'
    });
  });

  it('falls back to the next season when none is running', async () => {
    const { service, prisma } = createService();

    prisma.gameEvent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(event({ title: 'Upcoming', startsAt: new Date('2026-10-05T00:00:00Z') }));

    expect((await service.meta({ mode: 'ranked', query })).season?.title).toBe('Upcoming');
  });

  it('has no season for a mode without season events', async () => {
    const { service, prisma } = createService();

    expect((await service.meta({ mode: 'steelHunter', query })).season).toBeNull();
    expect(prisma.gameEvent.findFirst).not.toHaveBeenCalled();
  });
});

describe('ModeMetaReaderService.hub', () => {
  it('summarises every play mode', async () => {
    const { service } = createService();

    const hub = await service.hub();

    expect(hub.modes.map((mode) => mode.mode)).toEqual([...PLAY_MODES]);
    expect(hub.windowDays).toBe(MODE_META.windowDays);
  });

  it('counts tanks without the total row and lists only ranked leaders, capped', async () => {
    const { service, prisma } = createService();

    const tanks = Array.from({ length: MODE_META.hubLeaders + 2 }, (_, index) => aggregate({ tankId: index + 1, wins: 40 + index }));

    prisma.modeTankAggregate.findMany.mockResolvedValue([
      aggregate({ tankId: MODE_META.totalTankId, battles: 9_999 }),
      ...tanks,
      aggregate({ tankId: 100, battles: MODE_META.minBattles - 1 })
    ]);

    const [first] = (await service.hub()).modes;

    expect(first?.tanks).toBe(tanks.length + 1);
    expect(first?.battles).toBe(9_999);
    expect(first?.leaders).toHaveLength(MODE_META.hubLeaders);
    expect(first?.leaders.every((leader) => leader.rank !== null)).toBe(true);
    expect(first?.leaders[0]?.vehicle.tankId).toBe(tanks.length);
  });
});
