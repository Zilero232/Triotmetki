import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Mission, MissionBranch, MissionOperation, TankServerStats } from '../../../../../generated';

import { MissionCatalogReaderService } from '../mission-catalog-reader.service';
import { MissionPlanReaderService } from '../mission-plan-reader.service';
import { MissionProgressReaderService } from '../mission-progress-reader.service';
import { MissionTanksReaderService } from '../mission-tanks-reader.service';

const vehicle = (tankId: number): VehicleSummary => ({
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
});

const branch = (chainId: number): MissionBranch => ({
  gameVersionId: 1,
  operationId: 1,
  chainId,
  kind: 'vehicleClass',
  key: chainId === 1 ? 'lightTank' : 'heavyTank',
  nations: [],
  minTier: 4,
  maxTier: 10
});

const mission = (questId: number, chainId: number, position: number): Mission => ({
  gameVersionId: 1,
  questId,
  name: `q${questId}`,
  campaignId: 1,
  operationId: 1,
  chainId,
  position,
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
  hasHonors: false,
  requiredUnlocks: [],
  conditions: []
});

const stats = (tankId: number, avgFrags: number) => Object.assign(mock<TankServerStats>(), { tankId, avgFrags, winRate: 50, battles: 100 });

const rows = {
  operation: mock<MissionOperation>({ operationId: 1, campaignId: 1 }),
  branches: [branch(1), branch(2)],
  missions: [mission(10, 1, 1), mission(11, 1, 2), mission(20, 2, 1)]
};

const setup = ({ owned }: { owned: number[] }) => {
  const catalog = mock<MissionCatalogReaderService>();
  const progress = mock<MissionProgressReaderService>();
  const tanks = mock<MissionTanksReaderService>();

  catalog.operationById.mockResolvedValue(rows);
  progress.progressMap.mockResolvedValue(new Map());

  tanks.garageTanks.mockResolvedValue({
    state: owned.length > 0 ? 'ready' : 'noPrivateData',
    tanks: owned.map((tankId) => ({ tankId, battles: 10, wins: 5, inGarage: true }))
  });

  tanks.serverStats.mockResolvedValue({ cohort: 'all', rows: owned.map((tankId) => stats(tankId, tankId / 10)) });
  tanks.metricOf.mockReturnValue({ metric: 'frags', progressId: 'kills' });

  tanks.eligible.mockImplementation(async ({ branch: current }) =>
    current.chainId === 1 ? new Map(owned.map((tankId) => [tankId, vehicle(tankId)])) : new Map()
  );

  return { progress, tanks, service: new MissionPlanReaderService(catalog, progress, tanks) };
};

describe('MissionPlanReaderService.plan', () => {
  it('plans every open mission without suggesting tanks for an empty garage', async () => {
    const { service } = setup({ owned: [] });

    const plan = await service.plan({ userId: 'u', operationId: 1 });

    expect(plan.remaining).toBe(rows.missions.length);
    expect(plan.steps.every((step) => step.tank === null)).toBe(true);
  });

  it('suggests the owned eligible tank strongest on the mission metric', async () => {
    const { service } = setup({ owned: [3, 7] });

    const plan = await service.plan({ userId: 'u', operationId: 1 });
    const step = plan.steps.find((entry) => entry.chainId === 1);

    expect(step?.tank?.tankId).toBe(7);
  });

  it('suggests nothing for a branch none of the owned tanks fits', async () => {
    const { service } = setup({ owned: [3, 7] });

    const plan = await service.plan({ userId: 'u', operationId: 1 });

    expect(plan.steps.filter((entry) => entry.chainId === 2).every((entry) => entry.tank === null)).toBe(true);
  });

  it('leaves done missions out of the remaining steps', async () => {
    const { progress, service } = setup({ owned: [] });

    progress.progressMap.mockResolvedValue(new Map([[10, { done: true, honors: false }]]));

    const plan = await service.plan({ userId: 'u', operationId: 1 });

    expect(plan.steps.map((step) => step.questId)).not.toContain(10);
    expect(plan.remaining).toBe(rows.missions.length - 1);
  });

  it('reads server stats for owned tanks without a minimum sample', async () => {
    const { tanks, service } = setup({ owned: [3] });

    await service.plan({ userId: 'u', operationId: 1 });

    expect(tanks.serverStats).toHaveBeenCalledWith(expect.objectContaining({ tankIds: [3], minBattles: 0 }));
  });
});
