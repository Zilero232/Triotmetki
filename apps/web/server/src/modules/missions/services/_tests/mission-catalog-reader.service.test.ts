import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Mission, MissionBranch, MissionCampaign, MissionOperation } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CatalogEntry } from '../../../reference';

import { VehicleCatalogService } from '../../../reference';
import { MissionCatalogReaderService } from '../mission-catalog-reader.service';

const version = { id: 3, version: '2.0' };
const rewardTank = 55;

const summary: VehicleSummary = {
  tankId: rewardTank,
  name: 'Reward',
  shortName: 'Reward',
  slug: 'reward',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
};

const entry: CatalogEntry = {
  summary,
  dbType: 'heavyTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
};

const campaign = (campaignId: number, rewardTankId: number | null = null): MissionCampaign => ({
  gameVersionId: version.id,
  campaignId,
  branch: null,
  name: `Campaign ${campaignId}`,
  description: null,
  rewardTankId,
  rewardTankTag: null
});

const operation = (operationId: number, campaignId: number, rewardTankId: number | null = null): MissionOperation => ({
  gameVersionId: version.id,
  operationId,
  campaignId,
  name: null,
  description: null,
  nextOperationIds: [],
  chainsToUnlockNext: 1,
  rewardTankId,
  rewardTankTag: null
});

const branch = (chainId: number): MissionBranch => ({
  gameVersionId: version.id,
  operationId: 1,
  chainId,
  kind: 'vehicleClass',
  key: 'lightTank',
  nations: [],
  minTier: 4,
  maxTier: 10
});

const mission = (questId: number, chainId: number, operationId = 1): Mission => ({
  gameVersionId: version.id,
  questId,
  name: `q${questId}`,
  campaignId: 1,
  operationId,
  chainId,
  position: questId,
  title: `Q${questId}`,
  shortTitle: null,
  description: null,
  advice: null,
  minTier: 4,
  maxTier: 10,
  vehicleClasses: [],
  alliances: [],
  isInitial: false,
  isFinal: false,
  hasHonors: true,
  requiredUnlocks: [],
  conditions: []
});

type BranchCount = Awaited<ReturnType<PrismaService['missionBranch']['groupBy']>>[number];

const branchCount = (operationId: number, branches: number) => mock<BranchCount>({ operationId, _count: { _all: branches } });

const setup = ({ imported = true }: { imported?: boolean } = {}) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();

  prisma.missionCampaign.findFirst.mockResolvedValue(
    imported ? Object.assign(mock<MissionCampaign & { gameVersion: typeof version }>(), { gameVersion: version }) : null
  );

  catalog.find.mockImplementation(async (tankId) => (tankId === rewardTank ? entry : null));

  return { prisma, catalog, service: new MissionCatalogReaderService(prisma, catalog) };
};

describe('MissionCatalogReaderService.currentVersion', () => {
  it('returns the game version of the imported missions', async () => {
    const { service } = setup();

    expect(await service.currentVersion()).toEqual(version);
  });

  it('returns null before missions are imported', async () => {
    const { service } = setup({ imported: false });

    expect(await service.currentVersion()).toBeNull();
  });
});

describe('MissionCatalogReaderService.campaigns', () => {
  it('is empty before missions are imported', async () => {
    const { prisma, service } = setup({ imported: false });

    expect(await service.campaigns()).toEqual({ gameVersion: null, campaigns: [] });
    expect(prisma.missionOperation.findMany).not.toHaveBeenCalled();
  });

  it('nests each operation under its campaign with its branch and mission counts', async () => {
    const { prisma, service } = setup();

    prisma.missionCampaign.findMany.mockResolvedValue([campaign(1, rewardTank), campaign(2)]);
    prisma.missionOperation.findMany.mockResolvedValue([operation(1, 1), operation(2, 1), operation(3, 2, rewardTank)]);
    vi.mocked(prisma.missionBranch.groupBy).mockResolvedValue([branchCount(1, 5)]);
    prisma.mission.findMany.mockResolvedValue([mission(10, 1), mission(11, 1), mission(20, 1, 2)]);

    const result = await service.campaigns();
    const [first, second] = result.campaigns;

    expect(result.gameVersion).toBe(version.version);

    expect(first?.operations.map((entry) => [entry.operationId, entry.branchesCount, entry.questIds])).toEqual([
      [1, 5, [10, 11]],
      [2, 0, [20]]
    ]);

    expect(second?.operations.map((entry) => entry.operationId)).toEqual([3]);
  });

  it('resolves reward tanks from the catalog and leaves missing ones empty', async () => {
    const { prisma, service } = setup();

    prisma.missionCampaign.findMany.mockResolvedValue([campaign(1, rewardTank), campaign(2, 999)]);
    prisma.missionOperation.findMany.mockResolvedValue([operation(3, 2, rewardTank)]);
    vi.mocked(prisma.missionBranch.groupBy).mockResolvedValue([]);
    prisma.mission.findMany.mockResolvedValue([]);

    const { campaigns } = await service.campaigns();

    expect(campaigns.map((entry) => entry.reward?.tankId ?? null)).toEqual([rewardTank, null]);
    expect(campaigns[1]?.operations[0]).toMatchObject({ reward: summary, name: summary.name });
  });
});

describe('MissionCatalogReaderService.operation', () => {
  it('refuses an operation that belongs to another campaign', async () => {
    const { prisma, service } = setup();

    prisma.missionOperation.findUnique.mockResolvedValue(operation(1, 2));

    await expect(service.operation({ campaign: 1, operation: 1 })).rejects.toMatchObject({ status: 404 });
  });

  it('throws not found before missions are imported', async () => {
    const { service } = setup({ imported: false });

    await expect(service.operation({ campaign: 1, operation: 1 })).rejects.toMatchObject({ status: 404 });
  });

  it('throws not found when the campaign row is missing', async () => {
    const { prisma, service } = setup();

    prisma.missionOperation.findUnique.mockResolvedValue(operation(1, 1));
    prisma.missionBranch.findMany.mockResolvedValue([]);
    prisma.mission.findMany.mockResolvedValue([]);
    prisma.missionCampaign.findUnique.mockResolvedValue(null);

    await expect(service.operation({ campaign: 1, operation: 1 })).rejects.toMatchObject({ status: 404 });
  });

  it('gives each branch only its own missions', async () => {
    const { prisma, service } = setup();

    prisma.missionOperation.findUnique.mockResolvedValue(operation(1, 1));
    prisma.missionBranch.findMany.mockResolvedValue([branch(1), branch(2)]);
    prisma.mission.findMany.mockResolvedValue([mission(10, 1), mission(11, 1), mission(20, 2)]);
    prisma.missionCampaign.findUnique.mockResolvedValue(campaign(1));

    const view = await service.operation({ campaign: 1, operation: 1 });

    expect(view.operation).toMatchObject({ branchesCount: 2, missionsCount: 3 });
    expect(view.branches.map((entry) => entry.missions.map((row) => row.questId))).toEqual([[10, 11], [20]]);
  });
});

describe('MissionCatalogReaderService.operationById', () => {
  it('throws not found for an unknown operation', async () => {
    const { prisma, service } = setup();

    prisma.missionOperation.findUnique.mockResolvedValue(null);

    await expect(service.operationById(9)).rejects.toMatchObject({ status: 404 });
  });

  it('loads the rows of the operation within its own campaign', async () => {
    const { prisma, service } = setup();

    prisma.missionOperation.findUnique.mockResolvedValue(operation(4, 2));
    prisma.missionBranch.findMany.mockResolvedValue([branch(1)]);
    prisma.mission.findMany.mockResolvedValue([mission(10, 1)]);

    const rows = await service.operationById(4);

    expect(rows.operation.campaignId).toBe(2);
    expect(rows.missions.map((row) => row.questId)).toEqual([10]);
  });
});

describe('MissionCatalogReaderService.mission', () => {
  it('splits the mission from its branch', async () => {
    const { prisma, service } = setup();

    prisma.mission.findUnique.mockResolvedValue(Object.assign(mission(10, 1), { branch: branch(1) }));

    const context = await service.mission(10);

    expect(context.branch).toEqual(branch(1));
    expect(context.mission).toEqual(mission(10, 1));
  });

  it('throws not found for an unknown quest', async () => {
    const { prisma, service } = setup();

    prisma.mission.findUnique.mockResolvedValue(null);

    await expect(service.mission(999)).rejects.toMatchObject({ status: 404 });
  });
});
