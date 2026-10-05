import type { BuildOptions, ProvisionOption } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import type { BuildUsageAggregate } from '../../../../../generated';

import { shellInfoOf, toBuildUsage } from '../build-usage-view.mappers';

const option = (id: number, tag = `item_${id}`): ProvisionOption => ({
  id,
  tag,
  name: tag,
  kind: 'optionalDevice',
  variant: null,
  group: null,
  image: `https://img/${id}.png`,
  price: null,
  categories: [],
  effects: []
});

const options: BuildOptions = {
  tankId: 1,
  modules: { chassis: [], turrets: [], engines: [], radios: [] },
  crew: [{ role: 'commander', extraRoles: [] }],
  optionalDevices: [option(1), option(2)],
  consumables: [option(10)],
  directives: [],
  fieldModifications: [{ level: 2, kind: 'pair', options: [option(50, 'mod_left'), option(51, 'mod_right')] }],
  crewSkills: [{ skill: 'repair', name: 'Repair', nameEn: null, roles: [], isCommon: true, image: null, params: [] }],
  slots: { optionalDevices: 3, consumables: 3, directives: 1 }
};

const stat = { battles: 40, share: 0.5, winRate: 55, avgDamage: 3000 };

const row = (battles: number): BuildUsageAggregate => ({
  tankId: 1,
  mode: 'random',
  cohort: 'all',
  gameVersion: '2.0',
  battles,
  players: 12,
  winRate: 52,
  avgDamage: 2900,
  windowDays: 30,
  computedAt: new Date('2026-09-01T00:00:00Z'),
  usage: {
    equipment: [
      {
        slot: 0,
        picks: [
          { id: 1, ...stat },
          { id: 999, ...stat }
        ]
      }
    ],
    consumables: [{ id: 10, ...stat }],
    directives: [],
    fieldModifications: [{ tag: 'mod_right', ...stat }],
    shells: [{ shellId: 7, share: 1, ammoShare: 1, avgCount: 40 }],
    crew: [
      {
        role: 'commander',
        members: 12,
        skills: [
          { skill: 'repair', share: 0.9, avgPosition: 0 },
          { skill: 'gone', share: 0.5, avgPosition: 1 }
        ]
      }
    ]
  }
});

describe('toBuildUsage', () => {
  it('withholds every share below the minimum sample and keeps the sample size', () => {
    const usage = toBuildUsage({ row: row(5), options, shells: new Map(), mode: 'random', cohort: 'all' });

    expect(usage).toMatchObject({ battles: 5, players: 12, isEnough: false, winRate: null, equipment: [], crew: [] });
  });

  it('is an empty usage without a row', () => {
    expect(toBuildUsage({ row: null, options, shells: new Map(), mode: 'ranked', cohort: 'top1' })).toMatchObject({
      mode: 'ranked',
      cohort: 'top1',
      battles: 0,
      isEnough: false,
      computedAt: null
    });
  });

  it('resolves picks to this tank options and drops unknown ones', () => {
    const usage = toBuildUsage({
      row: row(100),
      options,
      shells: new Map([[7, { name: 'ap', kind: 'ARMOR_PIERCING', isPremium: false }]]),
      mode: 'random',
      cohort: 'all'
    });

    expect(usage.equipment).toEqual([{ slot: 0, picks: [{ option: option(1), ...stat }] }]);
    expect(usage.fieldModifications).toEqual([{ level: 2, kind: 'pair', picks: [{ option: option(51, 'mod_right'), ...stat }] }]);
    expect(usage.crew[0]?.skills.map((skill) => skill.skill)).toEqual(['repair']);
    expect(usage.shells[0]).toMatchObject({ shellId: 7, kind: 'ARMOR_PIERCING' });
  });
});

describe('shellInfoOf', () => {
  it('indexes the shots of every gun by shell id', () => {
    const shells = shellInfoOf({
      turrets: [{ guns: [{ shots: [{ shell: 'ap', shellId: 7, kind: 'ARMOR_PIERCING', isPremium: false }, { shell: 'x' }] }] }]
    });

    expect([...shells.keys()]).toEqual([7]);
  });
});
