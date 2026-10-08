import { describe, expect, it } from 'vitest';

import type { UsageSample } from '../build-usage.types';

import { bonusTypesOf, groupUsage, modeOfBonusType, summarizeUsage } from '../build-usage';

const sample = (overrides: Partial<UsageSample> & Pick<UsageSample, 'accountId'>): UsageSample => ({
  mode: 'random',
  won: true,
  damage: 3000,
  loadout: {
    optionalDevices: [1, 2, null],
    consumables: [10, 11, 12],
    directives: [20],
    shells: [
      { shellId: 100, count: 30 },
      { shellId: 101, count: 10 }
    ],
    fieldModifications: ['mod_a'],
    crew: [{ role: 'commander', skills: ['commander_sixthSense', 'repair'] }],
    gameplayId: 0
  },
  ...overrides
});

describe('modeOfBonusType', () => {
  it('maps the arena bonus types to our modes and ignores the rest', () => {
    expect(modeOfBonusType('1')).toBe('random');
    expect(modeOfBonusType('24')).toBe('random');
    expect(modeOfBonusType('43')).toBe('onslaught');
    expect(modeOfBonusType('29')).toBeNull();
    expect(modeOfBonusType('2')).toBeNull();
    expect(bonusTypesOf('frontline')).toEqual(['27']);
  });
});

describe('summarizeUsage', () => {
  it('weighs every player equally however many battles they played', () => {
    const grinder = Array.from({ length: 9 }, () => sample({ accountId: 'a' }));
    const other = sample({ accountId: 'b', loadout: { ...sample({ accountId: 'b' }).loadout, optionalDevices: [3, 2, null] } });

    const summary = summarizeUsage([...grinder, other]);
    const slot0 = summary.usage.equipment.find((slot) => slot.slot === 0);

    expect(summary.battles).toBe(10);
    expect(summary.players).toBe(2);

    expect(slot0?.picks.map((pick) => [pick.id, pick.share, pick.battles])).toEqual([
      [1, 0.5, 9],
      [3, 0.5, 1]
    ]);

    expect(summary.usage.equipment.find((slot) => slot.slot === 1)?.picks[0]).toMatchObject({ id: 2, share: 1 });
  });

  it('orders picks tied on share and battles by id, whatever order the battles came in', () => {
    const devices = (id: number) => ({ ...sample({ accountId: 'x' }).loadout, optionalDevices: [1, id, null] });
    const ids = (summary: ReturnType<typeof summarizeUsage>) => summary.usage.equipment.find((slot) => slot.slot === 1)?.picks.map((pick) => pick.id);

    const forward = summarizeUsage([sample({ accountId: 'a', loadout: devices(103) }), sample({ accountId: 'b', loadout: devices(102) })]);
    const backward = summarizeUsage([sample({ accountId: 'b', loadout: devices(102) }), sample({ accountId: 'a', loadout: devices(103) })]);

    expect(ids(forward)).toEqual(ids(backward));
  });

  it('keeps win rate and damage per pick from the raw battles', () => {
    const summary = summarizeUsage([
      sample({ accountId: 'a', won: true, damage: 4000 }),
      sample({ accountId: 'b', won: false, damage: 2000 }),
      sample({ accountId: 'c', won: null, damage: 3000 })
    ]);

    expect(summary.winRate).toBe(50);
    expect(summary.avgDamage).toBe(3000);
    expect(summary.usage.directives[0]).toMatchObject({ id: 20, winRate: 50, avgDamage: 3000, share: 1 });
  });

  it('splits the ammunition by shell and ignores battles without shell data', () => {
    const empty = sample({ accountId: 'b', loadout: { ...sample({ accountId: 'b' }).loadout, shells: [] } });
    const summary = summarizeUsage([sample({ accountId: 'a' }), empty]);

    expect(summary.usage.shells).toEqual([
      { shellId: 100, share: 1, ammoShare: 0.75, avgCount: 30 },
      { shellId: 101, share: 1, ammoShare: 0.25, avgCount: 10 }
    ]);
  });

  it('reports crew skills per role with their learning order', () => {
    const summary = summarizeUsage([
      sample({ accountId: 'a' }),
      sample({ accountId: 'b', loadout: { ...sample({ accountId: 'b' }).loadout, crew: [{ role: 'commander', skills: ['repair'] }] } })
    ]);

    expect(summary.usage.crew).toEqual([
      {
        role: 'commander',
        members: 2,
        skills: [
          { skill: 'repair', share: 1, avgPosition: 0.5 },
          { skill: 'commander_sixthSense', share: 0.5, avgPosition: 0 }
        ]
      }
    ]);
  });
});

describe('groupUsage', () => {
  it('splits by mode and builds the top cohorts from the rating ranks', () => {
    const samples = [
      sample({ accountId: 'best' }),
      sample({ accountId: 'good' }),
      sample({ accountId: 'rest' }),
      sample({ accountId: 'best', mode: 'onslaught' })
    ];

    const groups = groupUsage({
      samples,
      ranks: [
        { accountId: 'best', rank: 0 },
        { accountId: 'good', rank: 0.05 },
        { accountId: 'rest', rank: 0.5 }
      ]
    });

    const players = Object.fromEntries(groups.map((group) => [`${group.mode}:${group.cohort}`, group.players]));

    expect(players).toEqual({ 'random:all': 3, 'random:top10': 2, 'random:top1': 1, 'onslaught:all': 1, 'onslaught:top10': 1, 'onslaught:top1': 1 });
  });
});
