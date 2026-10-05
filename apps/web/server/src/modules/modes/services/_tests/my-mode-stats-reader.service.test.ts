import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { PlayerCareerReaderService } from '../../../players';
import type { VehicleCatalogService } from '../../../reference';
import type { MyModeBattleRow } from '../../mappers/my-mode-stats.types';
import type { ModesQueries } from '../../providers/modes-queries.provider.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { UserAccountsReaderService } from '../../../accounts';
import { bonusTypesOfMode } from '../../../reference';
import { MyModeStatsReaderService } from '../my-mode-stats-reader.service';

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

const typeOf = (mode: Parameters<typeof bonusTypesOfMode>[0]): string => bonusTypesOfMode(mode)[0] ?? '';

const row = (overrides: Pick<MyModeBattleRow, 'battle_type' | 'tank_id'> & Partial<MyModeBattleRow>): MyModeBattleRow => ({
  battles: 10,
  wins: 6,
  decided: 10,
  damage: 20_000,
  xp: 8_000,
  frags: 10,
  survived: 4,
  survival_known: 10,
  last_battle_at: new Date('2026-09-25T12:00:00Z'),
  ...overrides
});

const query = { days: 30 };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const career = mock<PlayerCareerReaderService>();
  const queries = mock<ModesQueries>();

  prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 42n }));
  queries.myModeBattles.mockResolvedValue([]);
  catalog.summary.mockImplementation(async (tankId) => summary(tankId));
  career.modes.mockResolvedValue({ accountId: 42, source: 'none', modes: [] });

  return {
    service: new MyModeStatsReaderService(prisma, catalog, career, new UserAccountsReaderService(prisma), queries),
    prisma,
    queries,
    catalog,
    career
  };
};

describe('MyModeStatsReaderService.stats', () => {
  it('refuses a user without a linked Lesta account', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.stats({ userId: 'u1', query })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('reports the account and window with no modes when nothing was played', async () => {
    const { service } = createService();

    await expect(service.stats({ userId: 'u1', query })).resolves.toEqual({ accountId: 42, days: query.days, modes: [], career: [] });
  });

  it('keeps special modes and drops random and unknown battle types', async () => {
    const { service, queries } = createService();

    queries.myModeBattles.mockResolvedValue([
      row({ battle_type: typeOf('onslaught'), tank_id: 1 }),
      row({ battle_type: typeOf('random'), tank_id: 2 }),
      row({ battle_type: '99999', tank_id: 3 })
    ]);

    const stats = await service.stats({ userId: 'u1', query });

    expect(stats.modes.map((line) => line.mode)).toEqual(['onslaught']);
    expect(stats.modes[0]?.tanks.map((tank) => tank.vehicle.tankId)).toEqual([1]);
  });

  it('sums a mode across its tanks', async () => {
    const { service, queries } = createService();

    queries.myModeBattles.mockResolvedValue([
      row({ battle_type: typeOf('frontline'), tank_id: 1, battles: 10 }),
      row({ battle_type: typeOf('frontline'), tank_id: 2, battles: 5 })
    ]);

    const [frontline] = (await service.stats({ userId: 'u1', query })).modes;

    expect(frontline?.battles).toBe(15);
    expect(frontline?.tanks.map((tank) => tank.vehicle.tankId)).toEqual([1, 2]);
  });

  it('looks up a tank played in several modes only once', async () => {
    const { service, queries, catalog } = createService();

    queries.myModeBattles.mockResolvedValue([
      row({ battle_type: typeOf('onslaught'), tank_id: 7 }),
      row({ battle_type: typeOf('ranked'), tank_id: 7 })
    ]);

    const stats = await service.stats({ userId: 'u1', query });

    expect(stats.modes).toHaveLength(2);
    expect(catalog.summary).toHaveBeenCalledTimes(1);
  });

  it('adds the stored Lesta career per mode without calling Lesta', async () => {
    const { service, career } = createService();
    const line = {
      mode: 'frontline' as const,
      battles: 120,
      winRate: 52,
      avgDamage: 2100,
      avgXp: 900,
      avgFrags: 1.1,
      survivalRate: 30,
      maxDamage: 7000,
      updatedAt: null,
      tanks: []
    };

    career.modes.mockResolvedValue({ accountId: 42, source: 'stored', modes: [line] });

    await expect(service.stats({ userId: 'u1', query })).resolves.toMatchObject({ career: [line] });
    expect(career.modes).toHaveBeenCalledWith({ accountId: 42n, allowLive: false });
  });
});
