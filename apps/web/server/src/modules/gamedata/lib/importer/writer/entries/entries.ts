import type { PlanWriteInput } from '../../importer.types';

import { WRITE } from '../../importer.constants';
import { inBatches, toStoredJson } from '../batches/batches';

export const writeEntries = async ({ prisma, plan, gameVersionId }: PlanWriteInput): Promise<number> => {
  await prisma.gameDataEntry.deleteMany({ where: { gameVersionId } });

  return inBatches({
    items: plan.entries,
    size: WRITE.entryBatchSize,
    run: (batch) =>
      prisma.gameDataEntry.createMany({
        data: batch.map((entry) => ({ gameVersionId, kind: entry.kind, key: entry.key, data: toStoredJson(entry.data) })),
        skipDuplicates: true
      })
  });
};
