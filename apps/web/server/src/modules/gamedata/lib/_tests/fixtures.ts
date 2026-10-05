import { readFileSync } from 'node:fs';

import type { SharedComponents } from '../parsers/vehicle/vehicle.types';

import { parseCrew } from '../parsers/crew/crew';
import { parseEquipments } from '../parsers/equipment/equipment';
import { parseOptionalDevices } from '../parsers/optional-devices/optional-devices';
import { parsePostProgression } from '../parsers/post-progression/post-progression';
import { parseVehicleList } from '../parsers/vehicle-list/vehicle-list';
import { parseShells } from '../parsers/vehicle/shells/shells';
import { parseSharedComponents, parseVehicle } from '../parsers/vehicle/vehicle';
import { GAME_PATHS } from '../source/source.constants';

export const readFixture = (path: string): string => readFileSync(new URL(`../parsers/${path}`, import.meta.url), 'utf8');

export const VEHICLE_FIXTURES = {
  list: 'vehicle-list/_tests/fixtures/list.xml',
  vehicle: 'vehicle/_tests/fixtures/R01_IS.xml',
  shells: 'vehicle/_tests/fixtures/shells.xml',
  components: {
    chassis: 'vehicle/_tests/fixtures/chassis.xml',
    turrets: 'vehicle/_tests/fixtures/turrets.xml',
    guns: 'vehicle/_tests/fixtures/guns.xml',
    engines: 'vehicle/_tests/fixtures/engines.xml',
    fuelTanks: 'vehicle/_tests/fixtures/fuelTanks.xml',
    radios: 'vehicle/_tests/fixtures/radios.xml'
  }
} as const;

export const COLLISION_FIXTURES = {
  collision: 'collision/_tests/fixtures/collision.json',
  index: 'collision/_tests/fixtures/vehicles.json',
  mtCollision: 'collision/_tests/fixtures/mt-R230_Maus.collision.json',
  mtIndex: 'collision/_tests/fixtures/mt-vehicles.json'
} as const;

export const COMMON_FIXTURES = {
  optionalDevices: 'optional-devices/_tests/fixtures/optional_devices.xml',
  equipments: 'equipment/_tests/fixtures/equipments.xml',
  tankmen: 'crew/_tests/fixtures/tankmen.xml',
  perks: 'crew/_tests/fixtures/perks.xml',
  trees: 'post-progression/_tests/fixtures/trees.xml',
  modifications: 'post-progression/_tests/fixtures/modifications.xml',
  pairs: 'post-progression/_tests/fixtures/pairs.xml',
  features: 'post-progression/_tests/fixtures/features.xml',
  prices: 'post-progression/_tests/fixtures/prices.xml',
  arenaList: 'arenas/_tests/fixtures/_list_.xml',
  arena: 'arenas/_tests/fixtures/01_karelia.xml'
} as const;

const loadComponents = (): SharedComponents => ({
  chassis: parseSharedComponents(readFixture(VEHICLE_FIXTURES.components.chassis)),
  turrets: parseSharedComponents(readFixture(VEHICLE_FIXTURES.components.turrets)),
  guns: parseSharedComponents(readFixture(VEHICLE_FIXTURES.components.guns)),
  engines: parseSharedComponents(readFixture(VEHICLE_FIXTURES.components.engines)),
  fuelTanks: parseSharedComponents(readFixture(VEHICLE_FIXTURES.components.fuelTanks)),
  radios: parseSharedComponents(readFixture(VEHICLE_FIXTURES.components.radios))
});

export const loadIs = () => {
  const entry = parseVehicleList({ xml: readFixture(VEHICLE_FIXTURES.list), nation: 'ussr' }).find((item) => item.tag === 'R01_IS');

  if (!entry) {
    throw new Error('R01_IS is missing from the list fixture');
  }

  return parseVehicle({
    xml: readFixture(VEHICLE_FIXTURES.vehicle),
    entry,
    components: loadComponents(),
    shells: parseShells({ xml: readFixture(VEHICLE_FIXTURES.shells), nation: 'ussr' })
  });
};

export const loadCatalog = () => ({
  optionalDevices: parseOptionalDevices(readFixture(COMMON_FIXTURES.optionalDevices)),
  equipment: parseEquipments(readFixture(COMMON_FIXTURES.equipments)),
  crew: parseCrew({ tankmenXml: readFixture(COMMON_FIXTURES.tankmen), perksXml: readFixture(COMMON_FIXTURES.perks) }),
  postProgression: parsePostProgression({
    treesXml: readFixture(COMMON_FIXTURES.trees),
    modificationsXml: readFixture(COMMON_FIXTURES.modifications),
    pairsXml: readFixture(COMMON_FIXTURES.pairs),
    featuresXml: readFixture(COMMON_FIXTURES.features),
    pricesXml: readFixture(COMMON_FIXTURES.prices)
  })
});

export const memoryFiles = (): Record<string, string> => {
  const vehicles = `${GAME_PATHS.vehicles}/ussr`;
  const components = VEHICLE_FIXTURES.components;

  return {
    [GAME_PATHS.version]: '1.45.0.5231\n',
    [`${vehicles}/list.xml`]: readFixture(VEHICLE_FIXTURES.list),
    [`${vehicles}/R01_IS.xml`]: readFixture(VEHICLE_FIXTURES.vehicle),
    [`${vehicles}/components/shells.xml`]: readFixture(VEHICLE_FIXTURES.shells),
    [`${vehicles}/components/chassis.xml`]: readFixture(components.chassis),
    [`${vehicles}/components/turrets.xml`]: readFixture(components.turrets),
    [`${vehicles}/components/guns.xml`]: readFixture(components.guns),
    [`${vehicles}/components/engines.xml`]: readFixture(components.engines),
    [`${vehicles}/components/fuelTanks.xml`]: readFixture(components.fuelTanks),
    [`${vehicles}/components/radios.xml`]: readFixture(components.radios),
    [`${GAME_PATHS.common}/optional_devices.xml`]: readFixture(COMMON_FIXTURES.optionalDevices),
    [`${GAME_PATHS.common}/equipments.xml`]: readFixture(COMMON_FIXTURES.equipments),
    [`${GAME_PATHS.postProgression}/trees.xml`]: readFixture(COMMON_FIXTURES.trees),
    [`${GAME_PATHS.postProgression}/modifications.xml`]: readFixture(COMMON_FIXTURES.modifications),
    [`${GAME_PATHS.postProgression}/pairs.xml`]: readFixture(COMMON_FIXTURES.pairs),
    [`${GAME_PATHS.postProgression}/features.xml`]: readFixture(COMMON_FIXTURES.features),
    [`${GAME_PATHS.postProgression}/prices.xml`]: readFixture(COMMON_FIXTURES.prices),
    [GAME_PATHS.tankmen]: readFixture(COMMON_FIXTURES.tankmen),
    [GAME_PATHS.perks]: readFixture(COMMON_FIXTURES.perks),
    [`${GAME_PATHS.arenas}/_list_.xml`]: readFixture(COMMON_FIXTURES.arenaList),
    [`${GAME_PATHS.arenas}/01_karelia.xml`]: readFixture(COMMON_FIXTURES.arena)
  };
};
