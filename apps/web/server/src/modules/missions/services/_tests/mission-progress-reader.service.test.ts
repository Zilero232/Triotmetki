import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserMissionProgress } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { MISSION_PLAN } from '../../config/plan.constants';
import { MissionCatalogReaderService } from '../mission-catalog-reader.service';
import { MissionProgressReaderService } from '../mission-progress-reader.service';

type OperationRows = Awaited<ReturnType<MissionCatalogReaderService['operationById']>>;

const mission = ({
  questId,
  chainId,
  position,
  description = 'Deal damage'
}: {
  questId: number;
  chainId: number;
  position: number;
  description?: string | null;
}) => ({
  gameVersionId: 1,
  questId,
  name: `m${questId}`,
  campaignId: 1,
  operationId: 1,
  chainId,
  position,
  title: `M${questId}`,
  shortTitle: null,
  description: null,
  advice: null,
  minTier: 4,
  maxTier: 10,
  vehicleClasses: [],
  alliances: [],
  isInitial: position === 1,
  isFinal: false,
  hasHonors: true,
  requiredUnlocks: [],
  conditions: [{ progressId: 'damage', isMain: true, isAward: true, display: 'regular', icon: null, goal: 1, title: null, description }]
});

const operationRows = ({ missions, chains }: { missions: ReturnType<typeof mission>[]; chains: readonly string[] }): OperationRows => ({
  operation: {
    gameVersionId: 1,
    operationId: 1,
    campaignId: 1,
    name: 'StuG IV',
    description: null,
    nextOperationIds: [],
    chainsToUnlockNext: chains.length,
    rewardTankId: null,
    rewardTankTag: null
  },
  branches: chains.map((key, index) => ({
    gameVersionId: 1,
    operationId: 1,
    chainId: index + 1,
    kind: 'vehicleClass',
    key,
    nations: [],
    minTier: 4,
    maxTier: 10
  })),
  missions
});

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mockDeep<MissionCatalogReaderService>();

  return { prisma, catalog, service: new MissionProgressReaderService(prisma, catalog) };
};

describe('MissionProgressReaderService.next', () => {
  it('returns nothing before personal missions are imported', async () => {
    const { catalog, service } = setup();

    catalog.currentVersion.mockResolvedValue(null);

    expect(await service.next('u')).toBeNull();
  });

  it('returns nothing when the mission last touched is gone from the catalog', async () => {
    const { prisma, catalog, service } = setup();

    catalog.currentVersion.mockResolvedValue({ id: 1, version: '1.45' });
    prisma.userMissionProgress.findFirst.mockResolvedValue(mock<UserMissionProgress>({ questId: 1 }));
    prisma.mission.findUnique.mockResolvedValue(null);

    expect(await service.next('u')).toBeNull();
    expect(catalog.operationById).not.toHaveBeenCalled();
  });

  it('lists the next open mission of each branch in the operation last touched', async () => {
    const { prisma, catalog, service } = setup();
    const missions = [
      mission({ questId: 1, chainId: 1, position: 1 }),
      mission({ questId: 2, chainId: 1, position: 2 }),
      mission({ questId: 16, chainId: 2, position: 1 })
    ];

    catalog.currentVersion.mockResolvedValue({ id: 1, version: '1.45' });
    prisma.userMissionProgress.findFirst.mockResolvedValue(mock<UserMissionProgress>({ questId: 1 }));
    prisma.userMissionProgress.findMany.mockResolvedValue([mock<UserMissionProgress>({ questId: 1, done: true, honors: true })]);
    prisma.mission.findUnique.mockResolvedValue(missions[0]);
    catalog.operationById.mockResolvedValue(operationRows({ missions, chains: ['lightTank', 'heavyTank'] }));

    expect(await service.next('u')).toEqual({
      operationName: 'StuG IV',
      campaignId: 1,
      operationId: 1,
      missions: [
        { branchKey: 'lightTank', title: 'M2', condition: 'Deal damage' },
        { branchKey: 'heavyTank', title: 'M16', condition: 'Deal damage' }
      ]
    });
  });

  it('starts a new player at the first mission of the current catalog', async () => {
    const { prisma, catalog, service } = setup();
    const missions = [mission({ questId: 1, chainId: 1, position: 1 })];

    catalog.currentVersion.mockResolvedValue({ id: 1, version: '1.45' });
    prisma.userMissionProgress.findFirst.mockResolvedValue(null);
    prisma.userMissionProgress.findMany.mockResolvedValue([]);
    prisma.mission.findFirst.mockResolvedValue(missions[0]);
    catalog.operationById.mockResolvedValue(operationRows({ missions, chains: ['lightTank'] }));

    expect((await service.next('u'))?.missions).toEqual([{ branchKey: 'lightTank', title: 'M1', condition: 'Deal damage' }]);
    expect(prisma.mission.findUnique).not.toHaveBeenCalled();
  });

  it('shows no condition when the main condition has no description', async () => {
    const { prisma, catalog, service } = setup();
    const missions = [mission({ questId: 1, chainId: 1, position: 1, description: null })];

    catalog.currentVersion.mockResolvedValue({ id: 1, version: '1.45' });
    prisma.userMissionProgress.findFirst.mockResolvedValue(null);
    prisma.userMissionProgress.findMany.mockResolvedValue([]);
    prisma.mission.findFirst.mockResolvedValue(missions[0]);
    catalog.operationById.mockResolvedValue(operationRows({ missions, chains: ['lightTank'] }));

    expect((await service.next('u'))?.missions[0]?.condition).toBeNull();
  });

  it('lists at most the telegram limit of branches', async () => {
    const { prisma, catalog, service } = setup();
    const chains = Array.from({ length: MISSION_PLAN.telegramNextLimit + 1 }, (_, index) => `branch${index}`);
    const missions = chains.map((_, index) => mission({ questId: index + 1, chainId: index + 1, position: 1 }));

    catalog.currentVersion.mockResolvedValue({ id: 1, version: '1.45' });
    prisma.userMissionProgress.findFirst.mockResolvedValue(null);
    prisma.userMissionProgress.findMany.mockResolvedValue([]);
    prisma.mission.findFirst.mockResolvedValue(missions[0]);
    catalog.operationById.mockResolvedValue(operationRows({ missions, chains }));

    expect((await service.next('u'))?.missions).toHaveLength(MISSION_PLAN.telegramNextLimit);
  });
});
