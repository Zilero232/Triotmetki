import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, PlayerTank, TankBattleDelta } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { VehicleCatalogService } from '../../../reference';
import { FirstWinReaderService } from '../first-win-reader.service';
import { OwnAccountReaderService } from '../own-account-reader.service';
import { catalogOf, vehicle } from './analytics.fixtures';

const now = new Date('2026-09-26T10:00:00Z');
const accountId = 7n;
const low = vehicle({ tankId: 1, tier: 6 });
const high = vehicle({ tankId: 2, tier: 10 });
const played = vehicle({ tankId: 3, tier: 10 });

const garageTank = (tankId: number, lastBattleAt: Date | null = null) => mock<PlayerTank>({ tankId, lastBattleAt });

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const accounts = mock<OwnAccountReaderService>();

  accounts.find.mockResolvedValue(accountId);
  catalog.all.mockResolvedValue(catalogOf(low, high, played));
  prisma.tankBattleDelta.findMany.mockResolvedValue([]);
  prisma.battle.findMany.mockResolvedValue([]);
  prisma.playerTank.findMany.mockResolvedValue([]);

  return { prisma, catalog, accounts, service: new FirstWinReaderService(prisma, catalog, accounts) };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FirstWinReaderService.taken', () => {
  it('merges wins from stat deltas and mod battles without duplicates', async () => {
    const { prisma, service } = setup();

    prisma.tankBattleDelta.findMany.mockResolvedValue([mock<TankBattleDelta>({ tankId: 1 }), mock<TankBattleDelta>({ tankId: 2 })]);
    prisma.battle.findMany.mockResolvedValue([mock<Battle>({ tankId: 2 }), mock<Battle>({ tankId: 3 })]);

    expect([...(await service.taken({ accountId, since: now }))].toSorted()).toEqual([1, 2, 3]);
  });
});

describe('FirstWinReaderService.status', () => {
  it('reports noLink without querying the garage when no account is linked', async () => {
    const { prisma, accounts, service } = setup();

    accounts.find.mockResolvedValue(null);

    const status = await service.status({ userId: 'u' });

    expect(status).toMatchObject({ accountId: null, state: 'noLink', taken: 0, available: 0, tanks: [] });
    expect(prisma.playerTank.findMany).not.toHaveBeenCalled();
  });

  it('reports noGarage when no garage tank is in the catalog', async () => {
    const { prisma, service } = setup();

    prisma.playerTank.findMany.mockResolvedValue([garageTank(999)]);

    expect(await service.status({ userId: 'u' })).toMatchObject({ state: 'noGarage', taken: 0, available: 0, tanks: [] });
  });

  it('counts wins since the last daily reset against the garage', async () => {
    const { prisma, service } = setup();

    prisma.playerTank.findMany.mockResolvedValue([garageTank(low.tankId), garageTank(high.tankId), garageTank(played.tankId)]);
    prisma.battle.findMany.mockResolvedValue([mock<Battle>({ tankId: played.tankId })]);

    const status = await service.status({ userId: 'u' });

    expect(status.state).toBe('ready');
    expect(status.taken).toBe(1);
    expect(status.available).toBe(status.tanks.length - status.taken);
    expect(new Date(status.resetAt).getTime()).toBeLessThanOrEqual(now.getTime());
    expect(new Date(status.nextResetAt).getTime()).toBeGreaterThan(now.getTime());
  });

  it('queries wins from the reset the window reports', async () => {
    const { prisma, service } = setup();

    prisma.playerTank.findMany.mockResolvedValue([garageTank(low.tankId)]);

    const status = await service.status({ userId: 'u' });

    expect(prisma.battle.findMany.mock.calls[0]?.[0]?.where?.startedAt).toEqual({ gte: new Date(status.resetAt) });
  });

  it('lists available tanks first, then higher tiers, then the most recently played', async () => {
    const { prisma, catalog, service } = setup();
    const extra = vehicle({ tankId: 4, tier: 10 });

    catalog.all.mockResolvedValue(catalogOf(low, high, played, extra));

    prisma.playerTank.findMany.mockResolvedValue([
      garageTank(low.tankId),
      garageTank(played.tankId, new Date('2026-09-25T10:00:00Z')),
      garageTank(high.tankId, new Date('2026-09-20T10:00:00Z')),
      garageTank(extra.tankId, new Date('2026-09-24T10:00:00Z'))
    ]);

    prisma.battle.findMany.mockResolvedValue([mock<Battle>({ tankId: played.tankId })]);

    const status = await service.status({ userId: 'u' });

    expect(status.tanks.map((tank) => tank.vehicle.tankId)).toEqual([extra.tankId, high.tankId, low.tankId, played.tankId]);
  });
});

describe('FirstWinReaderService.availableCount', () => {
  it('returns zero for an empty garage', async () => {
    const { service } = setup();

    expect(await service.availableCount({ accountId, since: now })).toBe(0);
  });
});
