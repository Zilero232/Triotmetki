import type { Mission, MissionBranch, MissionOperation } from '../../../../../../generated';
import type { PyValue } from '../../python-literal/python-literal.types';
import type { XmlNode } from '../../xml/xml.types';
import type { PERSONAL_MISSION_BRANCHES } from './personal-missions.constants';

export type PersonalMissionBranchName = (typeof PERSONAL_MISSION_BRANCHES)[number];

export type PersonalMissionJson = boolean | number | string | PersonalMissionJson[] | { [key: string]: PersonalMissionJson } | null;

export type PersonalMissionRewardVehicle = {
  nation: string;
  tag: string;
};

export type PersonalCampaign = {
  campaignId: number;
  branch: PersonalMissionBranchName | null;
  name: string | null;
  description: string | null;
  reward: PersonalMissionRewardVehicle | null;
};

export type PersonalOperation = Omit<MissionOperation, 'gameVersionId' | 'rewardTankId' | 'rewardTankTag'> & {
  reward: PersonalMissionRewardVehicle | null;
};

export type PersonalBranch = Omit<MissionBranch, 'gameVersionId'>;

export type PersonalMissionCondition = {
  progressId: string;
  isMain: boolean;
  isAward: boolean;
  template: string | null;
  display: string | null;
  icon: string | null;
  goal: number | null;
  params: Record<string, PersonalMissionJson>;
  title: string | null;
  description: string | null;
};

export type PersonalMission = Omit<Mission, 'conditions' | 'gameVersionId'> & {
  branch: PersonalMissionBranchName;
  levelGroup: string | null;
  conditions: PersonalMissionCondition[];
};

export type PersonalMissionsData = {
  campaigns: PersonalCampaign[];
  operations: PersonalOperation[];
  branches: PersonalBranch[];
  missions: PersonalMission[];
  warnings: string[];
};

export type PersonalMissionSources = {
  seasonsXml: string;
  tilesXml: string;
  listXml: string;
  configPy?: string;
  messages?: Record<string, string>;
};

export type Localize = (key: string | undefined) => string | undefined;

export type RenderTextInput = {
  template: string;
  values: Record<string, PersonalMissionJson>;
};

export type ParseConditionsInput = {
  mission: string;
  config: PyValue | undefined;
  localize: Localize;
};

export type ParseOperationsInput = {
  root: XmlNode;
  localize: Localize;
};

export type ParseCampaignsInput = {
  seasonsRoot: XmlNode;
  tilesRoot: XmlNode;
  localize: Localize;
};

export type CampaignBranchInput = {
  missions: PersonalMission[];
  campaignId: number;
};

export type ParseMissionsInput = {
  root: XmlNode;
  config: Record<string, PyValue>;
  localize: Localize;
  seasonOf: Map<number, number>;
};

export type OperationRewardInput = {
  seasonId: number;
  tileId: number;
};

export type ConditionTitleInput = {
  mission: string;
  progressId: string;
};

export type ConditionDescriptionInput = {
  mission: string;
  progressId: string;
};
