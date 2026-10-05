import { describe, expect, it } from 'vitest';

import type { Mission, MissionBranch, MissionOperation } from '../../../../../generated';

import { readConditions, toBranchView, toMissionView, toOperationSummary } from '../mission.mappers';

const condition = (progressId: string, isMain: boolean, display = 'regular') => ({
  progressId,
  isMain,
  isAward: true,
  display,
  icon: null,
  goal: 2,
  title: null,
  description: null
});

const mission = (position: number): Mission => ({
  gameVersionId: 1,
  questId: position,
  name: `regular_1_1_${position}`,
  campaignId: 1,
  operationId: 1,
  chainId: 1,
  position,
  title: `LT-${position}`,
  shortTitle: null,
  description: null,
  advice: null,
  minTier: 4,
  maxTier: 10,
  vehicleClasses: ['lightTank', 'unknown'],
  alliances: [],
  isInitial: position === 1,
  isFinal: false,
  hasHonors: true,
  requiredUnlocks: [],
  conditions: [condition('battlesSeries', true, 'header'), condition('spotNumber', true), condition('alive', false)]
});

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

describe('readConditions', () => {
  it('drops a stored value that no longer matches the shape', () => {
    expect(readConditions([{ progressId: 'x' }])).toEqual([]);
    expect(readConditions(null)).toEqual([]);
  });
});

describe('toMissionView', () => {
  it('maps conditions to metrics and keeps only known vehicle classes', () => {
    const view = toMissionView(mission(1));

    expect(view.metric).toBe('spotting');
    expect(view.vehicleTypes).toEqual(['lightTank']);

    expect(view.conditions.map(({ progressId, isHeader, metric }) => [progressId, isHeader, metric])).toEqual([
      ['battlesSeries', true, null],
      ['spotNumber', false, 'spotting'],
      ['alive', false, 'survival']
    ]);
  });
});

describe('toBranchView', () => {
  it('orders missions by position and reads the class from the branch key', () => {
    const view = toBranchView({ branch, missions: [mission(2), mission(1)] });

    expect(view.vehicleType).toBe('lightTank');
    expect(view.missions.map((item) => item.position)).toEqual([1, 2]);
  });
});

describe('toOperationSummary', () => {
  it('names an unlocalized operation after its reward tank', () => {
    const operation: MissionOperation = {
      gameVersionId: 1,
      operationId: 8,
      campaignId: 3,
      name: null,
      description: null,
      nextOperationIds: [9],
      chainsToUnlockNext: 3,
      rewardTankId: null,
      rewardTankTag: null
    };

    expect(toOperationSummary({ operation, reward: null, branchesCount: 3, questIds: [1, 2] }).name).toBe('#8');
  });
});
