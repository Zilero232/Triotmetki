import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Mission, MissionBranch, PlayerTank, TankServerStats, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CatalogEntry } from '../../../reference';

import { UserAccountsReaderService } from '../../../accounts';
import { VehicleCatalogService } from '../../../reference';
import { MISSION_TANKS } from '../../config';
import { MissionCatalogService } from '../mission-catalog.service';
import { MissionTanksService } from '../mission-tanks.service';

const mission: Mission = {
  gameVersionId: 1,
  questId: 3,
  name: 'regular_1_1_3',
  campaignId: 1,
  operationId: 1,
  chainId: 1,
  position: 3,
  title: 'LT-3',
  shortTitle: null,
  description: null,
  advice: null,
  minTier: 8,
  maxTier: 8,
  vehicleClasses: ['lightTank'],
  alliances: [],
  isInitial: false,
  isFinal: false,
  hasHonors: true,
  requiredUnlocks: [],
  conditions: [{ progressId: 'kills', isMain: true, isAward: true, display: 'regular', icon: null, goal: 1, title: null, description: null }]
};

const branch: MissionBranch = {
  gameVersionId: 1,
  operationId: 1,
  chainId: 1,
  kind: 'vehicleClass',
  key: 'lightTank',
  nations: [],
  minTier: 4,
  maxTier: 10
};

const entry = (tankId: number): CatalogEntry => ({
  summary: {
    tankId,
    name: `T${tankId}`,
    shortName: `T${tankId}`,
    slug: `t${tankId}`,
    nation: 'ussr',
    type: 'lightTank',
    tier: 8,
    isPremium: false,
    isCollectible: false,
    status: 'researchable',
    images: { small: null, contour: null, big: null }
  },
  dbType: 'lightTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const stats = (tankId: number, avgFrags: number): TankServerStats => ({
  tankId,
  mode: 'random',
  period: 'd30',
  cohort: 'average',
  battles: 500,
  players: 50,
  samples: 0,
  winRate: 50,
  playerWinRate: 50,
  winRateDiff: 0,
  avgDamage: 1500,
  avgFrags,
  avgSpotted: 2,
  avgXp: 700,
  avgBlocked: 200,
  survivalRate: 30,
  accuracy: 70,
  popularityRank: null,
  tierListRank: null,
  computedAt: new Date('2026-09-25T00:00:00Z')
});

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const vehicles = mockDeep<VehicleCatalogService>();
  const missions = mockDeep<MissionCatalogService>();

  missions.mission.mockResolvedValue({ mission, branch });
  vehicles.filter.mockResolvedValue([entry(1), entry(2)]);

  return { prisma, vehicles, service: new MissionTanksService(prisma, vehicles, missions, new UserAccountsReaderService(prisma)) };
};

describe('MissionTanksService.tanks', () => {
  it('ranks eligible tanks by the stat behind the main condition', async () => {
    const { prisma, service } = setup();

    prisma.tankServerStats.findMany.mockResolvedValue([stats(1, 0.8), stats(2, 1.3)]);

    const result = await service.tanks({ questId: 3, period: '30d', limit: 10 });
    const [best, worst] = result.tanks;

    expect(result).toMatchObject({ metric: 'frags', progressId: 'kills', cohort: MISSION_TANKS.cohort });

    expect(result.tanks.map((tank) => [tank.vehicle.tankId, tank.value])).toEqual([
      [2, 1.3],
      [1, 0.8]
    ]);

    expect(best?.score).toBeGreaterThan(worst?.score ?? Infinity);
  });

  it('leaves out tanks with stats that the mission does not accept', async () => {
    const { prisma, service } = setup();

    prisma.tankServerStats.findMany.mockResolvedValue([stats(1, 0.8), stats(99, 3)]);

    const result = await service.tanks({ questId: 3, period: '30d', limit: 10 });

    expect(result.tanks.map((tank) => tank.vehicle.tankId)).toEqual([1]);
  });

  it('returns no tanks and queries no stats when no vehicle is eligible', async () => {
    const { prisma, vehicles, service } = setup();

    vehicles.filter.mockResolvedValue([]);

    const result = await service.tanks({ questId: 3, period: '30d', limit: 10 });

    expect(result).toMatchObject({ cohort: MISSION_TANKS.cohort, generatedAt: null, tanks: [] });
    expect(prisma.tankServerStats.findMany).not.toHaveBeenCalled();
  });

  it('falls back to the whole server when the average cohort has no rows', async () => {
    const { prisma, service } = setup();

    prisma.tankServerStats.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([stats(1, 1)]);

    expect((await service.tanks({ questId: 3, period: '30d', limit: 10 })).cohort).toBe(MISSION_TANKS.fallbackCohort);
  });
});

describe('MissionTanksService.garage', () => {
  it('asks for a linked account first', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    expect(await service.garage({ userId: 'u', questId: 3 })).toMatchObject({ state: 'noLink', tanks: [] });
  });

  it('reports missing private data when the hangar flag was never collected', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 10n }));
    prisma.playerTank.findMany.mockResolvedValue([]);

    expect((await service.garage({ userId: 'u', questId: 3 })).state).toBe('noPrivateData');
  });

  it('ranks the owned eligible tanks and adds own results', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 10n }));

    prisma.playerTank.findMany.mockResolvedValue([
      mock<PlayerTank>({ tankId: 1, battles: 40, wins: 20, inGarage: true }),
      mock<PlayerTank>({ tankId: 99, battles: 5, wins: 5, inGarage: true }),
      mock<PlayerTank>({ tankId: 2, battles: 10, wins: 6, inGarage: false })
    ]);

    prisma.tankServerStats.findMany.mockResolvedValue([stats(1, 1.1)]);

    const garage = await service.garage({ userId: 'u', questId: 3 });

    expect(garage.state).toBe('ready');
    expect(garage.tanks).toEqual([expect.objectContaining({ tankId: 1, value: 1.1, ownBattles: 40, ownWinRate: 50 })]);
  });

  it('keeps an owned tank without server stats at zero and gives no win rate without own battles', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 10n }));
    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ tankId: 2, battles: 0, wins: 0, inGarage: true })]);
    prisma.tankServerStats.findMany.mockResolvedValue([]);

    const garage = await service.garage({ userId: 'u', questId: 3 });

    expect(garage.tanks).toEqual([expect.objectContaining({ tankId: 2, value: 0, battles: 0, ownBattles: 0, ownWinRate: null })]);
  });
});
