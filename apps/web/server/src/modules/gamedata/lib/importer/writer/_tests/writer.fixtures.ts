import { mock, mockDeep } from 'vitest-mock-extended';

import type { GameVersion, PrismaClient } from '../../../../../../../generated';
import type { ImportedVehicleSummary, ImportPlan, VehicleRow } from '../../importer.types';

import { vehicleImages } from '../../../../../../lib/lesta';
import { memoryFiles } from '../../../_tests/fixtures';
import { buildGameData } from '../../../game-data/game-data';
import { createMemoryReader } from '../../../source/local/local';
import { createImportPlan } from '../../plan/plan';

export const VEHICLE_IMAGES = vehicleImages({ nation: 'ussr', tag: 'R00_Fixture' });

export const summary = (fields: Partial<ImportedVehicleSummary> = {}): ImportedVehicleSummary => ({
  tier: 8,
  type: 'heavyTank',
  isPremium: false,
  armor: { hull: [100, 80, 60], turrets: {} },
  guns: {},
  engines: {},
  chassis: {},
  speed: { forward: 35, backward: 12 },
  ...fields
});

const [baseVehicle] = createImportPlan({
  data: await buildGameData({ reader: createMemoryReader({ sourceId: 'RU', files: memoryFiles() }), nations: ['ussr'] })
}).vehicles;

export const vehicleRow = (tankId: number, fields: Partial<VehicleRow> = {}): VehicleRow => {
  if (!baseVehicle) {
    throw new Error('the game data fixture has no vehicle');
  }

  return { ...baseVehicle, tankId, name: `Tank ${tankId}`, shortName: `T${tankId}`, slug: `tank-${tankId}`, images: VEHICLE_IMAGES, ...fields };
};

export const plan = (fields: Partial<ImportPlan> = {}): ImportPlan => ({
  version: '2.1.0',
  title: 'Update 2.1',
  revision: { owner: 'o', repo: 'r', ref: 'main', sha: 'abc123', sourceId: 'RU' },
  vehicles: [],
  profiles: [],
  modules: [],
  provisions: [],
  crewRoles: [],
  crewSkills: [],
  arenas: [],
  entries: [],
  summaries: new Map(),
  warnings: [],
  ...fields
});

export const createPrisma = (gameVersionId = 7) => {
  const prisma = mockDeep<PrismaClient>();

  prisma.$transaction.mockResolvedValue([]);
  prisma.gameVersion.upsert.mockResolvedValue(mock<GameVersion>({ id: gameVersionId }));
  prisma.vehicle.findMany.mockResolvedValue([]);
  prisma.provision.findMany.mockResolvedValue([]);
  prisma.arena.findMany.mockResolvedValue([]);
  prisma.vehicleSpecHistory.findMany.mockResolvedValue([]);

  return prisma;
};
