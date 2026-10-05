import { NATIONS } from '@otmetki/gamedata';

import type { SharedComponents } from '../parsers/vehicle/vehicle.types';
import type { SourceReader } from '../source/source.types';
import type { ArenaData, BuildGameDataInput, GameData, NationData, ReadNationInput, ReadRequiredInput } from './game-data.types';

import { errorMessage } from '../../../../common/lib';
import { isBattleArena, parseArena, parseArenaList } from '../parsers/arenas/arenas';
import { ARENA_FILES } from '../parsers/arenas/arenas.constants';
import { parseCrew } from '../parsers/crew/crew';
import { parseEquipments } from '../parsers/equipment/equipment';
import { parseOptionalDevices } from '../parsers/optional-devices/optional-devices';
import { parsePostProgression } from '../parsers/post-progression/post-progression';
import { isRegularVehicle, parseVehicleList } from '../parsers/vehicle-list/vehicle-list';
import { parseShells } from '../parsers/vehicle/shells/shells';
import { emptyComponents, parseSharedComponents, parseVehicle } from '../parsers/vehicle/vehicle';
import { COMPONENT_FILES, SHELLS } from '../parsers/vehicle/vehicle.constants';
import { assertMtClient } from '../source/mt-client/mt-client';
import { MT_CLIENT } from '../source/mt-client/mt-client.constants';
import { GAME_DATA_SOURCES, GAME_PATHS } from '../source/source.constants';

const readRequired = async ({ reader, path }: ReadRequiredInput): Promise<string> => {
  const content = await reader.read(path);

  if (content === undefined) {
    throw new Error(`Game data file is missing: ${path}`);
  }

  return content;
};

const readComponents = async ({ reader, nation }: Pick<ReadNationInput, 'nation' | 'reader'>): Promise<SharedComponents> => {
  const components = emptyComponents();
  const keys = Object.keys(COMPONENT_FILES).filter((key): key is keyof SharedComponents => key in components);

  await Promise.all(
    keys.map(async (key) => {
      const xml = await reader.read(`${GAME_PATHS.vehicles}/${nation}/components/${COMPONENT_FILES[key]}`);

      components[key] = xml ? parseSharedComponents(xml) : {};
    })
  );

  return components;
};

const readNation = async ({ reader, nation, includeVehicle, vehicleLimit }: ReadNationInput): Promise<NationData> => {
  const listXml = await reader.read(`${GAME_PATHS.vehicles}/${nation}/list.xml`);

  if (!listXml) {
    return { vehicles: [], shells: [], warnings: [`No vehicle list for ${nation}`] };
  }

  const [components, shellsXml] = await Promise.all([
    readComponents({ reader, nation }),
    reader.read(`${GAME_PATHS.vehicles}/${nation}/components/${SHELLS.file}`)
  ]);

  const shells = shellsXml ? parseShells({ xml: shellsXml, nation }) : {};
  const entries = parseVehicleList({ xml: listXml, nation }).filter(includeVehicle).slice(0, vehicleLimit);
  const warnings: string[] = [];

  const vehicles = await Promise.all(
    entries.map(async (entry) => {
      const xml = await reader.read(`${GAME_PATHS.vehicles}/${nation}/${entry.tag}.xml`);

      if (!xml) {
        warnings.push(`Missing vehicle file ${nation}/${entry.tag}.xml`);

        return undefined;
      }

      try {
        return parseVehicle({ xml, entry, components, shells });
      } catch (error) {
        warnings.push(`Failed to parse ${nation}/${entry.tag}: ${errorMessage(error)}`);

        return undefined;
      }
    })
  );

  return {
    vehicles: vehicles.filter((vehicle) => vehicle !== undefined),
    shells: Object.values(shells),
    warnings
  };
};

const readArenas = async (reader: SourceReader): Promise<ArenaData> => {
  const listXml = await reader.read(`${GAME_PATHS.arenas}/${ARENA_FILES.list}`);
  const warnings: string[] = [];

  if (!listXml) {
    return { arenas: [], warnings: ['No arena list'] };
  }

  const list = parseArenaList(listXml).filter((item) => isBattleArena(item.name));

  const arenas = await Promise.all(
    list.map(async (item) => {
      const xml = await reader.read(`${GAME_PATHS.arenas}/${item.name}.xml`);

      if (!xml) {
        warnings.push(`Missing arena file ${item.name}.xml`);

        return undefined;
      }

      try {
        return parseArena({ xml, arenaId: item.name, numericId: item.id });
      } catch (error) {
        warnings.push(`Failed to parse arena ${item.name}: ${errorMessage(error)}`);

        return undefined;
      }
    })
  );

  return { arenas: arenas.filter((arena) => arena !== undefined), warnings };
};

export const buildGameData = async ({
  reader,
  nations = NATIONS,
  includeVehicle = isRegularVehicle,
  vehicleLimit,
  onProgress
}: BuildGameDataInput): Promise<GameData> => {
  const label = `${reader.revision.owner}/${reader.revision.repo}@${reader.revision.sha}`;
  const [rawVersion, readme] = await Promise.all([reader.read(GAME_PATHS.version), reader.read(MT_CLIENT.readme)]);
  const version = assertMtClient({ label, version: rawVersion?.trim(), guid: GAME_DATA_SOURCES[reader.revision.sourceId].guid, readme });

  onProgress?.(`${MT_CLIENT.product} ${version} from ${label}`);

  const nationData: NationData[] = [];

  for (const nation of nations) {
    const data = await readNation({ reader, nation, includeVehicle, vehicleLimit });

    onProgress?.(`${nation}: ${data.vehicles.length} vehicles, ${data.shells.length} shells`);
    nationData.push(data);
  }

  const [optionalDevicesXml, equipmentsXml, treesXml, modificationsXml, pairsXml, featuresXml, pricesXml, tankmenXml, perksXml] = await Promise.all([
    readRequired({ reader, path: `${GAME_PATHS.common}/optional_devices.xml` }),
    readRequired({ reader, path: `${GAME_PATHS.common}/equipments.xml` }),
    readRequired({ reader, path: `${GAME_PATHS.postProgression}/trees.xml` }),
    readRequired({ reader, path: `${GAME_PATHS.postProgression}/modifications.xml` }),
    reader.read(`${GAME_PATHS.postProgression}/pairs.xml`),
    reader.read(`${GAME_PATHS.postProgression}/features.xml`),
    reader.read(`${GAME_PATHS.postProgression}/prices.xml`),
    readRequired({ reader, path: GAME_PATHS.tankmen }),
    reader.read(GAME_PATHS.perks)
  ]);

  const { arenas, warnings: arenaWarnings } = await readArenas(reader);

  onProgress?.(`${arenas.length} arenas`);

  return {
    version,
    revision: reader.revision,
    vehicles: nationData.flatMap((data) => data.vehicles),
    shells: nationData.flatMap((data) => data.shells),
    optionalDevices: parseOptionalDevices(optionalDevicesXml),
    equipment: parseEquipments(equipmentsXml),
    crew: parseCrew({ tankmenXml, perksXml }),
    postProgression: parsePostProgression({ treesXml, modificationsXml, pairsXml, featuresXml, pricesXml }),
    arenas,
    warnings: [...nationData.flatMap((data) => data.warnings), ...arenaWarnings]
  };
};
