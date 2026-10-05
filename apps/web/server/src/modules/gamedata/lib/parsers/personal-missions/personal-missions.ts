import { groupBy } from 'remeda';

import type { PyValue } from '../../python-literal/python-literal.types';
import type { XmlNode, XmlValue } from '../../xml/xml.types';
import type {
  CampaignBranchInput,
  ParseCampaignsInput,
  ParseMissionsInput,
  ParseOperationsInput,
  PersonalBranch,
  PersonalCampaign,
  PersonalMission,
  PersonalMissionBranchName,
  PersonalMissionRewardVehicle,
  PersonalMissionsData,
  PersonalMissionSources,
  PersonalOperation
} from './personal-missions.types';

import { oneOf } from '../../guards/guards';
import { isPyDict, readAssignment } from '../../python-literal/python-literal';
import { bool, entries, get, isXmlNode, nodes, num, nums, parseXml, text, words } from '../../xml/xml';
import { VEHICLE_CLASSES } from '../vehicle-list/vehicle-list.constants';
import { parseConditions } from './conditions/conditions';
import { createLocalize } from './localization/localization';
import {
  ALLIANCE_NATIONS,
  PERSONAL_MISSION_BRANCHES,
  PERSONAL_MISSION_CONFIG_NAMES,
  PERSONAL_MISSION_KEYS,
  PERSONAL_MISSION_TAGS
} from './personal-missions.constants';

const isBranchName = oneOf(PERSONAL_MISSION_BRANCHES);
const isVehicleClass = oneOf(VEHICLE_CLASSES);

const rewardVehicle = (value: XmlValue | undefined): PersonalMissionRewardVehicle | null => {
  const [nation, tag] = (text(value) ?? '').split(':');

  return nation && tag ? { nation, tag } : null;
};

const tokenQuestRewards = (root: XmlNode): Map<string, PersonalMissionRewardVehicle> => {
  const rewards = new Map<string, PersonalMissionRewardVehicle>();

  for (const quest of nodes(get({ value: root, path: 'quests/tokenQuest' }))) {
    const id = text(quest.id);
    const vehicle = rewardVehicle(get({ value: quest, path: 'bonus/vehicle' }));

    if (id && vehicle) {
      rewards.set(id, vehicle);
    }
  }

  return rewards;
};

const readConfig = (source: string | undefined): Record<string, PyValue> => {
  if (!source) {
    return {};
  }

  return Object.assign(
    {},
    ...PERSONAL_MISSION_CONFIG_NAMES.map((name) => {
      const value = readAssignment({ source, name });

      return isPyDict(value) ? value.entries : {};
    })
  );
};

const parseOperations = ({ root, localize }: ParseOperationsInput): PersonalOperation[] => {
  const rewards = tokenQuestRewards(root);

  return entries(root).flatMap(([key, value]) => {
    const operationId = isXmlNode(value) ? num(value.id) : undefined;
    const campaignId = isXmlNode(value) ? num(value.seasonID) : undefined;

    if (!PERSONAL_MISSION_KEYS.operationNode.test(key) || !isXmlNode(value) || operationId === undefined || campaignId === undefined) {
      return [];
    }

    return [
      {
        operationId,
        campaignId,
        name: localize(text(value.userString)) ?? null,
        description: localize(text(value.description)) ?? null,
        nextOperationIds: nums(value.nextTileIDs),
        chainsToUnlockNext: num(value.chainsCountToUnlockNext) ?? num(value.chainsCount) ?? 1,
        reward: rewards.get(PERSONAL_MISSION_KEYS.operationReward({ seasonId: campaignId, tileId: operationId })) ?? null
      }
    ];
  });
};

const parseCampaigns = ({ seasonsRoot, tilesRoot, localize }: ParseCampaignsInput): PersonalCampaign[] => {
  const rewards = tokenQuestRewards(tilesRoot);

  return entries(seasonsRoot).flatMap(([, value]) => {
    const campaignId = isXmlNode(value) ? num(value.id) : undefined;

    if (!isXmlNode(value) || campaignId === undefined) {
      return [];
    }

    return [
      {
        campaignId,
        branch: null,
        name: localize(text(value.userString)) ?? null,
        description: localize(text(value.description)) ?? null,
        reward: rewards.get(PERSONAL_MISSION_KEYS.campaignReward(campaignId)) ?? null
      }
    ];
  });
};

const parseMissions = ({ root, config, localize, seasonOf }: ParseMissionsInput) =>
  entries(root).flatMap(([name, value]): PersonalMission[] => {
    const match = PERSONAL_MISSION_KEYS.missionName.exec(name);
    const questId = isXmlNode(value) ? num(value.id) : undefined;
    const branch = match?.[1];

    if (!match || !isXmlNode(value) || questId === undefined || !isBranchName(branch)) {
      return [];
    }

    const operationId = Number(match[2]);
    const tags = words(value.tags);
    const minTier = num(value.minLevel) ?? 1;

    return [
      {
        questId,
        name,
        branch,
        campaignId: seasonOf.get(operationId) ?? 0,
        operationId,
        chainId: Number(match[3]),
        position: Number(match[4]),
        title: localize(text(value.userString)) ?? name,
        shortTitle: localize(text(value.shortUserString)) ?? null,
        description: localize(text(value.description)) ?? null,
        advice: localize(text(value.advice)) ?? null,
        minTier,
        maxTier: num(value.maxLevel) ?? minTier,
        vehicleClasses: tags.filter(isVehicleClass),
        alliances: tags.filter((tag) => tag.startsWith(PERSONAL_MISSION_TAGS.alliancePrefix)),
        levelGroup: tags.find((tag) => tag.startsWith(PERSONAL_MISSION_TAGS.levelGroupPrefix)) ?? null,
        isInitial: tags.includes(PERSONAL_MISSION_TAGS.initial),
        isFinal: tags.includes(PERSONAL_MISSION_TAGS.final) || bool(value.rewardByDemand) === true,
        hasHonors: !tags.includes(PERSONAL_MISSION_TAGS.withoutAdd),
        requiredUnlocks: nums(value.requiredUnlocks),
        conditions: parseConditions({ mission: name, config: config[name], localize })
      }
    ];
  });

const branchOf = (missions: PersonalMission[]): Pick<PersonalBranch, 'key' | 'kind' | 'nations'> => {
  const initial = missions.find((mission) => mission.isInitial) ?? missions[0];
  const alliance = initial?.alliances[0];
  const vehicleClass = initial?.vehicleClasses[0];

  if (alliance) {
    return { kind: 'alliance', key: alliance, nations: [...(ALLIANCE_NATIONS[alliance] ?? [])] };
  }

  if (vehicleClass) {
    return { kind: 'vehicleClass', key: vehicleClass, nations: [] };
  }

  return { kind: 'levelGroup', key: initial?.levelGroup ?? `${PERSONAL_MISSION_TAGS.levelGroupPrefix}${initial?.chainId ?? 0}`, nations: [] };
};

const groupBranches = (missions: PersonalMission[]): PersonalBranch[] => {
  const groups = groupBy(missions, (mission) => `${mission.operationId}:${mission.chainId}`);

  return Object.values(groups).map((group) => ({
    operationId: group[0].operationId,
    chainId: group[0].chainId,
    ...branchOf(group),
    minTier: Math.min(...group.map((mission) => mission.minTier)),
    maxTier: Math.max(...group.map((mission) => mission.maxTier))
  }));
};

const campaignBranch = ({ missions, campaignId }: CampaignBranchInput): PersonalMissionBranchName | null =>
  missions.find((mission) => mission.campaignId === campaignId)?.branch ?? null;

export const parsePersonalMissions = ({ seasonsXml, tilesXml, listXml, configPy, messages = {} }: PersonalMissionSources): PersonalMissionsData => {
  const localize = createLocalize(messages);
  const tilesRoot = parseXml(tilesXml);
  const operations = parseOperations({ root: tilesRoot, localize });
  const seasonOf = new Map(operations.map((operation) => [operation.operationId, operation.campaignId]));
  const config = readConfig(configPy);
  const missions = parseMissions({ root: parseXml(listXml), config, localize, seasonOf }).sort((a, b) => a.questId - b.questId);
  const campaigns = parseCampaigns({ seasonsRoot: parseXml(seasonsXml), tilesRoot, localize }).map((campaign) => ({
    ...campaign,
    branch: campaignBranch({ missions, campaignId: campaign.campaignId })
  }));

  const warnings = [
    ...(configPy ? [] : ['personal missions: no condition config, conditions are empty']),
    ...(Object.keys(messages).length > 0 ? [] : ['personal missions: no localization, names fall back to keys']),
    ...missions
      .filter((mission) => mission.conditions.length === 0 && configPy)
      .map((mission) => `personal missions: no conditions for ${mission.name}`)
  ];

  return { campaigns, operations, branches: groupBranches(missions), missions, warnings };
};
