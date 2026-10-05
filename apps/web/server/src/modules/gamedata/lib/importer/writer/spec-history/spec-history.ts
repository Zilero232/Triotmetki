import type { PlanWriteInput, SpecHistoryCounts } from '../../importer.types';

import { diffSpecs } from '../../diff/diff';
import { inBatches, toStoredJson } from '../batches/batches';

export const writeSpecHistory = async ({ prisma, plan, gameVersionId }: PlanWriteInput): Promise<SpecHistoryCounts> => {
  const previous = await prisma.vehicleSpecHistory.findMany({
    where: { gameVersionId: { not: gameVersionId } },
    orderBy: { capturedAt: 'desc' },
    distinct: ['tankId'],
    select: { tankId: true, specs: true }
  });

  const previousByTank = new Map(previous.map((row) => [row.tankId, row.specs]));
  let changedVehicles = 0;

  const rows = [...plan.summaries.entries()].map(([tankId, summary]) => {
    const before = previousByTank.get(tankId);
    const diff = before === undefined ? undefined : diffSpecs({ before, after: JSON.parse(JSON.stringify(summary)) });

    if (diff && diff.length > 0) {
      changedVehicles += 1;
    }

    return { tankId, specs: toStoredJson(summary), diff: diff === undefined ? undefined : toStoredJson(diff) };
  });

  const specHistory = await inBatches({
    items: rows,
    run: (batch) =>
      prisma.$transaction(
        batch.map((row) =>
          prisma.vehicleSpecHistory.upsert({
            where: { tankId_gameVersionId: { tankId: row.tankId, gameVersionId } },
            create: { tankId: row.tankId, gameVersionId, specs: row.specs, diff: row.diff },
            update: { specs: row.specs, diff: row.diff }
          })
        )
      )
  });

  return { specHistory, changedVehicles };
};
