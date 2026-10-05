import type { PersonalMissionRewardVehicle } from '../../parsers/personal-missions/personal-missions.types';
import type { PersonalMissionCounts, TankRef, WritePersonalMissionsInput } from '../personal-missions.types';

import { toStoredJson } from '../../importer/writer/batches/batches';

const refKey = ({ nation, tag }: TankRef): string => `${nation}:${tag}`;

export const writePersonalMissions = async ({ prisma, gameVersionId, data }: WritePersonalMissionsInput): Promise<PersonalMissionCounts> => {
  const rewards = [...data.campaigns, ...data.operations].flatMap((item) => (item.reward ? [item.reward] : []));
  const vehicles = await prisma.vehicle.findMany({
    where: { tag: { in: rewards.map((reward) => reward.tag) } },
    select: { tankId: true, nation: true, tag: true }
  });

  const tankIds = new Map(
    vehicles.flatMap((vehicle) => (vehicle.tag ? [[refKey({ nation: vehicle.nation, tag: vehicle.tag }), vehicle.tankId] as const] : []))
  );

  const rewardColumns = (reward: PersonalMissionRewardVehicle | null) => ({
    rewardTankId: reward ? (tankIds.get(refKey(reward)) ?? null) : null,
    rewardTankTag: reward?.tag ?? null
  });

  await prisma.$transaction([
    prisma.missionCampaign.deleteMany({ where: { gameVersionId } }),
    prisma.missionCampaign.createMany({
      data: data.campaigns.map(({ campaignId, branch, name, description, reward }) => ({
        gameVersionId,
        campaignId,
        branch,
        name,
        description,
        ...rewardColumns(reward)
      }))
    }),
    prisma.missionOperation.createMany({
      data: data.operations.map(({ reward, ...operation }) => ({ gameVersionId, ...operation, ...rewardColumns(reward) }))
    }),
    prisma.missionBranch.createMany({ data: data.branches.map((branch) => ({ gameVersionId, ...branch })) }),
    prisma.mission.createMany({
      data: data.missions.map(({ branch: _branch, levelGroup: _levelGroup, conditions, ...mission }) => ({
        gameVersionId,
        ...mission,
        conditions: toStoredJson(conditions)
      }))
    })
  ]);

  return {
    campaigns: data.campaigns.length,
    operations: data.operations.length,
    branches: data.branches.length,
    missions: data.missions.length
  };
};
