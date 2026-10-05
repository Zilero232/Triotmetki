import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CrewSkill, Provision } from '../../../../../generated';

import { loadCatalog, loadIs } from '../../../gamedata/lib/_tests/fixtures';
import { BUILD_SLOTS } from '../../config/provisions.constants';
import { BuildDataReaderService } from '../build-data-reader.service';
import { BuildOptionsReaderService } from '../build-options-reader.service';

const is = loadIs();
const catalog = loadCatalog();

const provision = ({ id, type, data }: { id: number; type: Provision['type']; data: unknown }): Provision => ({
  provisionId: id,
  name: `item ${id}`,
  nameKey: null,
  descriptionKey: null,
  tag: `item_${id}`,
  type,
  description: null,
  image: null,
  priceCredit: 1_000,
  priceGold: null,
  weight: null,
  tankIds: [is.tankId],
  data: JSON.parse(JSON.stringify(data)),
  updatedAt: new Date()
});

const skill = ({ name, roles, isCommon }: { name: string; roles: string[]; isCommon: boolean }): CrewSkill => ({
  skill: name,
  name,
  nameEn: null,
  nameKey: null,
  descriptionKey: null,
  type: null,
  roles,
  isCommon,
  description: null,
  descriptionEn: null,
  image: null,
  data: { name, role: 'common', roles, isCommon, params: [], extras: {}, singleOnVehicle: false },
  updatedAt: new Date()
});

const createService = () => {
  const data = mock<BuildDataReaderService>();
  const [device] = catalog.optionalDevices;
  const [consumable] = catalog.equipment.filter((item) => item.kind === 'consumable');

  data.vehicle.mockResolvedValue(is);

  data.provisions.mockResolvedValue([
    provision({ id: 1, type: 'optionalDevice', data: device }),
    provision({ id: 2, type: 'equipment', data: consumable })
  ]);

  data.crewSkills.mockResolvedValue([
    skill({ name: 'repair', roles: ['commander'], isCommon: true }),
    skill({ name: 'gunner_sniper', roles: ['gunner'], isCommon: false }),
    skill({ name: 'unknown_role_skill', roles: ['pilot'], isCommon: false })
  ]);

  data.progression.mockResolvedValue({ tree: null, pairs: [] });

  return new BuildOptionsReaderService(data);
};

describe('BuildOptionsReaderService.options', () => {
  it('lists the modules of the vehicle with the names a loadout selects them by', async () => {
    const options = await createService().options(is.tankId);

    expect(options.modules.turrets.map((turret) => turret.name)).toEqual(is.turrets.map((turret) => turret.name));
    expect(options.modules.turrets[0]?.guns.length).toBe(is.turrets[0]?.guns.length);
  });

  it('sorts the compatible provisions into their slots', async () => {
    const options = await createService().options(is.tankId);

    expect(options.optionalDevices.map((option) => option.id)).toEqual([1]);
    expect(options.consumables.map((option) => option.id)).toEqual([2]);
    expect(options.slots).toEqual(BUILD_SLOTS);
  });

  it('offers only the skills the crew can learn', async () => {
    const options = await createService().options(is.tankId);

    expect(options.crewSkills.map((option) => option.skill)).toEqual(['repair', 'gunner_sniper']);
  });
});
