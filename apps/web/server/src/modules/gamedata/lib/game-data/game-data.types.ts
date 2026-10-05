import type { CrewData, Equipment, Nation, OptionalDevice, PostProgression, Shell, VehicleListEntry, VehicleSpec } from '@otmetki/gamedata';

import type { Arena } from '../parsers/arenas/arenas.types';
import type { SourceReader, SourceRevision } from '../source/source.types';

export type GameData = {
  version?: string;
  revision: SourceRevision;
  vehicles: VehicleSpec[];
  shells: Shell[];
  optionalDevices: OptionalDevice[];
  equipment: Equipment[];
  crew: CrewData;
  postProgression: PostProgression;
  arenas: Arena[];
  warnings: string[];
};

export type BuildGameDataInput = {
  reader: SourceReader;
  nations?: readonly Nation[];
  includeVehicle?: (entry: VehicleListEntry) => boolean;
  vehicleLimit?: number;
  onProgress?: (message: string) => void;
};

export type NationData = {
  vehicles: VehicleSpec[];
  shells: Shell[];
  warnings: string[];
};

export type ReadNationInput = {
  reader: SourceReader;
  nation: Nation;
  includeVehicle: (entry: VehicleListEntry) => boolean;
  vehicleLimit?: number;
};

export type ReadRequiredInput = {
  reader: SourceReader;
  path: string;
};

export type ArenaData = {
  arenas: Arena[];
  warnings: string[];
};
