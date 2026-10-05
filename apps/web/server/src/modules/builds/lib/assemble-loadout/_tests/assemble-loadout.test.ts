import type { z } from 'zod';

import { loadoutRequestSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { CrewSkill, Provision } from '../../../../../../generated';

import { loadIs } from '../../../../gamedata/lib/_tests/fixtures';
import { LOADOUT_DEFAULTS } from '../../../config/provisions.constants';
import { assembleLoadout } from '../assemble-loadout';

const vehicle = loadIs();
const tankId = vehicle.tankId;

const provision = ({ provisionId, type, fits = true }: Pick<Provision, 'provisionId' | 'type'> & { fits?: boolean }): Provision => ({
  provisionId,
  name: `item-${provisionId}`,
  nameKey: null,
  descriptionKey: null,
  tag: `tag-${provisionId}`,
  type,
  description: null,
  image: null,
  priceCredit: null,
  priceGold: null,
  weight: null,
  tankIds: fits ? [tankId] : [],
  data: { name: `item-${provisionId}`, modifiers: [], tags: [], kind: 'consumable' },
  updatedAt: new Date()
});

const skill = (name: string): CrewSkill => ({
  skill: name,
  name,
  nameEn: null,
  nameKey: null,
  descriptionKey: null,
  type: null,
  roles: [],
  isCommon: false,
  description: null,
  descriptionEn: null,
  image: null,
  data: { name, params: [], roles: [], extras: {} },
  updatedAt: new Date()
});

const provisions = [
  provision({ provisionId: 1, type: 'optionalDevice' }),
  provision({ provisionId: 2, type: 'optionalDevice', fits: false }),
  provision({ provisionId: 10, type: 'equipment' }),
  provision({ provisionId: 20, type: 'directive' }),
  provision({ provisionId: 30, type: 'fieldModification' })
];

const skills = [skill('repair'), skill('camouflage')];

type RequestInput = Omit<z.input<typeof loadoutRequestSchema>, 'loadout'> & { loadout?: Partial<z.input<typeof loadoutRequestSchema>['loadout']> };

const request = ({ loadout, ...extra }: RequestInput = {}) =>
  loadoutRequestSchema.parse({ loadout: { equipment: [], consumables: [], crewSkills: {}, ...loadout }, ...extra });

describe('assembleLoadout', () => {
  it('installs compatible items and ignores nothing', () => {
    const result = assembleLoadout({
      tankId,
      vehicle,
      provisions,
      skills,
      request: request({
        loadout: { equipment: [1], consumables: [10], directives: [20], fieldModifications: ['tag-30'], crewSkills: { commander: ['repair'] } }
      })
    });

    expect(result.ignored).toEqual([]);
    expect(result.input.optionalDevices).toHaveLength(1);
    expect(result.input.consumables).toHaveLength(1);
    expect(result.input.directives).toHaveLength(1);
    expect(result.input.fieldModifications).toHaveLength(1);
    expect(result.input.crew?.skills).toHaveLength(1);
  });

  it('lists unknown, incompatible and wrongly typed items as ignored', () => {
    const result = assembleLoadout({
      tankId,
      vehicle,
      provisions,
      skills,
      request: request({
        loadout: { equipment: [2, 99], consumables: [1], fieldModifications: ['missing'], crewSkills: { gunner: ['sixth-sense'] } }
      })
    });

    expect(result.ignored).toEqual(['optionalDevice:2', 'optionalDevice:99', 'equipment:1', 'fieldModification:missing', 'crewSkill:sixth-sense']);
    expect(result.input.optionalDevices).toEqual([]);
    expect(result.input.consumables).toEqual([]);
  });

  it('ignores a provision whose data fails its guard', () => {
    const broken = { ...provision({ provisionId: 3, type: 'optionalDevice' }), data: { name: 'broken' } };
    const result = assembleLoadout({ tankId, vehicle, provisions: [broken], skills, request: request({ loadout: { equipment: [3] } }) });

    expect(result.ignored).toEqual(['optionalDevice:3']);
  });

  it('maps the specialized flag by the slot the device sits in', () => {
    const result = assembleLoadout({
      tankId,
      vehicle,
      provisions,
      skills,
      request: request({ loadout: { equipment: [null, 1] }, specialized: [true, false] })
    });

    expect(result.input.optionalDevices?.map((device) => device.specialized)).toEqual([false]);
  });

  it('treats a slot without a specialized flag as not specialized', () => {
    const result = assembleLoadout({ tankId, vehicle, provisions, skills, request: request({ loadout: { equipment: [1] } }) });

    expect(result.input.optionalDevices?.[0]?.specialized).toBe(false);
  });

  it('asks for a crew skill once even when several roles want it', () => {
    const result = assembleLoadout({
      tankId,
      vehicle,
      provisions,
      skills,
      request: request({ loadout: { crewSkills: { commander: ['repair'], driver: ['repair'] } } })
    });

    expect(result.input.crew?.skills).toHaveLength(1);
    expect(result.input.crew?.catalog).toHaveLength(skills.length);
  });

  it('uses the default preset when the loadout names no profile', () => {
    const result = assembleLoadout({ tankId, vehicle, provisions, skills, request: request() });

    expect(result.profileId).toBe(LOADOUT_DEFAULTS.preset);
    expect(result.input.modules).toBe(LOADOUT_DEFAULTS.preset);
  });

  it('uses the stock preset only for the stock profile', () => {
    expect(assembleLoadout({ tankId, vehicle, provisions, skills, request: request({ loadout: { profileId: 'stock' } }) }).profileId).toBe('stock');
    expect(assembleLoadout({ tankId, vehicle, provisions, skills, request: request({ loadout: { profileId: 'anything' } }) }).profileId).toBe('top');
  });

  it('reports a custom profile when exact modules are chosen', () => {
    const modules = { gun: 'gun' };
    const result = assembleLoadout({ tankId, vehicle, provisions, skills, request: request({ loadout: { profileId: 'stock' }, modules }) });

    expect(result.profileId).toBe('custom');
    expect(result.input.modules).toEqual(modules);
  });
});
