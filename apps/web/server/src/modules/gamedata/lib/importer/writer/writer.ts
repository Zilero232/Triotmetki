import type { ImportCounts, WriteImportPlanInput } from '../importer.types';

import { writeCatalog } from './catalog/catalog';
import { writeEntries } from './entries/entries';
import { upsertGameVersion } from './game-version/game-version';
import { writeSpecHistory } from './spec-history/spec-history';

export const writeImportPlan = async ({ prisma, plan, mode, markCurrent, onProgress }: WriteImportPlanInput): Promise<ImportCounts> => {
  const gameVersionId = await upsertGameVersion({ prisma, plan, markCurrent });

  onProgress?.(`Game version ${plan.version} → id ${gameVersionId}`);

  const entries = await writeEntries({ prisma, plan, gameVersionId });

  onProgress?.(`${entries} raw game data entries`);

  if (mode === 'snapshot') {
    return {
      gameVersionId,
      entries,
      vehicles: 0,
      profiles: 0,
      modules: 0,
      provisions: 0,
      crewRoles: 0,
      crewSkills: 0,
      arenas: 0,
      specHistory: 0,
      changedVehicles: 0
    };
  }

  const catalog = await writeCatalog({ prisma, plan });

  onProgress?.(`${catalog.vehicles} vehicles, ${catalog.modules} modules, ${catalog.provisions} provisions, ${catalog.arenas} arenas`);

  const history = await writeSpecHistory({ prisma, plan, gameVersionId });

  return { gameVersionId, entries, ...catalog, ...history };
};
