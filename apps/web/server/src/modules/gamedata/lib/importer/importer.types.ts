import type {
  Equipment,
  FieldModification,
  FinalStats,
  ModuleBase,
  ModulePreset,
  OptionalDevice,
  VehicleFilter,
  VehicleSpec
} from '@otmetki/gamedata';
import type { ModuleSlot } from '@otmetki/schemas';

import type { Arena, CrewRole, CrewSkill, GameDataEntry, Module, PrismaClient, Provision, Vehicle, VehicleProfile } from '../../../../../generated';
import type { LestaVehicleImages } from '../../../../lib/lesta';
import type { GameData } from '../game-data/game-data.types';
import type { LocalizedMessages } from '../localization/localization.types';
import type { SourceRevision } from '../source/source.types';

export type SpecPrimitive = boolean | number | string | null;

export type SpecChange = {
  path: string;
  before?: SpecPrimitive;
  after?: SpecPrimitive;
};

export type DiffInput = {
  before: unknown;
  after: unknown;
  path?: string;
};

export type CollectChangesInput = DiffInput & {
  path: string;
  changes: SpecChange[];
};

export type ProfileStats = Omit<FinalStats, 'crew' | 'factors' | 'staticAttributes' | 'terrainResistance'>;

export type ImportedVehicleSummary = {
  tier: number;
  type: string;
  isPremium: boolean;
  price?: { amount: number; currency: string };
  armor: { hull: number[]; turrets: Record<string, number[]> };
  stock?: ProfileStats;
  top?: ProfileStats;
  guns: Record<
    string,
    { reloadTime: number; aimingTime: number; dispersion: number; shells: Record<string, { damage: number; penetration: number }> }
  >;
  engines: Record<string, number>;
  chassis: Record<string, number>;
  speed: { forward: number; backward: number };
};

export type LocalizedVehicleFields = Partial<Pick<Vehicle, 'description' | 'name' | 'shortName'>>;

export type VehicleRow = Pick<
  Vehicle,
  | 'description'
  | 'descriptionKey'
  | 'isCollectible'
  | 'isPremium'
  | 'isWheeled'
  | 'name'
  | 'nameKey'
  | 'nation'
  | 'prevTankIds'
  | 'shortName'
  | 'slug'
  | 'tankId'
  | 'tier'
  | 'type'
> & {
  tag: string;
  localized: LocalizedVehicleFields;
  images: LestaVehicleImages;
  priceCredit?: number;
  priceGold?: number;
  specs: VehicleSpec;
  crew: VehicleSpec['crew'];
  modulesTree: ModuleTreeNode[];
  nextTanks: NextTank[];
};

export type ModuleTreeNode = {
  moduleId: number;
  type: string;
  name: string;
  tier?: number;
  unlocks: { type: string; name: string; id?: number; xp?: number }[];
};

export type NextTank = {
  tankId: number;
  tag: string;
  xp?: number;
};

export type ProfileRow = Pick<VehicleProfile, 'isDefault' | 'moduleIds' | 'profileId' | 'tankId'> & {
  data: ProfileStats;
};

export type ModuleRow = Pick<Module, 'moduleId' | 'name' | 'nation' | 'tankIds' | 'tier' | 'type'> & {
  priceCredit?: number;
  weight?: number;
  data: Record<string, unknown>;
};

export type LocalizedProvisionFields = Partial<Pick<Provision, 'description' | 'name'>>;

export type ProvisionRow = Pick<Provision, 'name' | 'provisionId' | 'tankIds' | 'type'> & {
  tag: string;
  nameKey?: string;
  descriptionKey?: string;
  description?: string;
  image?: string;
  localized: LocalizedProvisionFields;
  priceCredit?: number;
  priceGold?: number;
  data: Record<string, unknown>;
};

export type CrewRoleRow = Pick<CrewRole, 'name' | 'role' | 'skills'>;

export type CrewSkillRow = Pick<CrewSkill, 'isCommon' | 'name' | 'roles' | 'skill'> & {
  type?: string;
  data: Record<string, unknown>;
};

export type LocalizedArenaFields = Partial<Pick<Arena, 'description' | 'name'>>;

export type ArenaRow = Pick<Arena, 'arenaId' | 'description' | 'descriptionKey' | 'modes' | 'name' | 'nameEn' | 'nameKey' | 'slug'> & {
  localized: LocalizedArenaFields;
  camouflageType?: string;
  sizeMeters: number;
  image: string;
  data: Record<string, unknown>;
};

export type EntryRow = Pick<GameDataEntry, 'key' | 'kind'> & {
  data: unknown;
};

export type ImportPlan = {
  version: string;
  title: string;
  revision: SourceRevision;
  vehicles: VehicleRow[];
  profiles: ProfileRow[];
  modules: ModuleRow[];
  provisions: ProvisionRow[];
  crewRoles: CrewRoleRow[];
  crewSkills: CrewSkillRow[];
  arenas: ArenaRow[];
  entries: EntryRow[];
  summaries: Map<number, ImportedVehicleSummary>;
  warnings: string[];
};

export type CreateImportPlanInput = {
  data: GameData;
  messages?: LocalizedMessages;
};

export type BuildVehicleRowsInput = {
  vehicles: VehicleSpec[];
  messages?: LocalizedMessages;
};

export type LocalizeVehicleInput = {
  vehicle: VehicleSpec;
  messages?: LocalizedMessages;
};

export type LocalizeArenaInput = {
  arena: GameData['arenas'][number];
  messages?: LocalizedMessages;
};

export type SummarizeVehicleInput = {
  vehicle: VehicleSpec;
  stock?: FinalStats;
  top?: FinalStats;
};

type ImportMode = 'full' | 'snapshot';

export type WriteImportPlanInput = {
  prisma: PrismaClient;
  plan: ImportPlan;
  mode: ImportMode;
  markCurrent: boolean;
  onProgress?: (message: string) => void;
};

export type ImportCounts = {
  gameVersionId: number;
  vehicles: number;
  profiles: number;
  modules: number;
  provisions: number;
  crewRoles: number;
  crewSkills: number;
  arenas: number;
  entries: number;
  specHistory: number;
  changedVehicles: number;
};

export type VehicleModule = {
  kind: ModuleSlot;
  module: ModuleBase;
};

export type PriceColumns = {
  priceCredit?: number;
  priceGold?: number;
};

export type CompatibleTanksInput = {
  filter: VehicleFilter;
  vehicles: VehicleSpec[];
};

export type TryLoadoutInput = {
  vehicle: VehicleSpec;
  preset: ModulePreset;
  warnings: string[];
};

type ProvisionRowContext = {
  vehicles: VehicleSpec[];
  messages: LocalizedMessages;
  sourceId: SourceRevision['sourceId'];
};

export type DeviceRowInput = ProvisionRowContext & {
  device: OptionalDevice;
};

export type EquipmentRowInput = ProvisionRowContext & {
  item: Equipment;
};

export type ModificationRowInput = Omit<ProvisionRowContext, 'vehicles'> & {
  modification: FieldModification;
  tankIds: number[];
};

export type LocalizeProvisionInput = {
  messages: LocalizedMessages;
  nameKey: string | undefined;
  descriptionKey?: string;
};

export type ProvisionIconInput = {
  sourceId: SourceRevision['sourceId'];
  folder: string;
  icon: string | undefined;
};

export type InBatchesInput<T> = {
  items: T[];
  size?: number;
  run: (batch: T[]) => Promise<unknown>;
};

export type PlanWriteInput = {
  prisma: PrismaClient;
  plan: ImportPlan;
  gameVersionId: number;
};

export type CatalogCounts = Omit<ImportCounts, 'changedVehicles' | 'entries' | 'gameVersionId' | 'specHistory'>;

export type SpecHistoryCounts = Pick<ImportCounts, 'changedVehicles' | 'specHistory'>;

export type KeyOfInput = {
  item: unknown;
  index: number;
};
