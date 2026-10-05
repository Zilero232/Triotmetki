import type { ArmorWriteCounts, PurgeArmorModelsInput, WriteArmorModelsInput } from './writer.types';

import { toStoredJson } from '../../importer/writer/batches/batches';
import { armorStorageKey } from '../pack/pack';
import { ARMOR_PACK } from '../pack/pack.constants';

export const writeArmorModels = async ({ prisma, storage, collected, onProgress }: WriteArmorModelsInput): Promise<ArmorWriteCounts> => {
  const { version, sourceSha, models } = collected;
  const existing = new Map(
    (await prisma.vehicleArmorModel.findMany({ select: { tankId: true, hash: true, storageKey: true } })).map((row) => [row.tankId, row])
  );

  const counts: ArmorWriteCounts = { uploaded: 0, unchanged: 0, replaced: 0 };

  for (const [index, model] of models.entries()) {
    const previous = existing.get(model.tankId);
    const storageKey = previous?.hash === model.hash ? previous.storageKey : armorStorageKey({ tankId: model.tankId, hash: model.hash });

    if (previous?.hash === model.hash) {
      counts.unchanged += 1;
    } else {
      await storage.put({ key: storageKey, body: model.bytes, contentType: ARMOR_PACK.contentType });
      counts.uploaded += 1;
    }

    const row = {
      gameVersion: version,
      storageKey,
      hash: model.hash,
      bytes: model.bytes.byteLength,
      modules: toStoredJson(model.modules),
      sourceSha
    };

    await prisma.vehicleArmorModel.upsert({ where: { tankId: model.tankId }, create: { tankId: model.tankId, ...row }, update: row });

    if (previous && previous.storageKey !== storageKey) {
      await storage.remove(previous.storageKey);
      counts.replaced += 1;
    }

    if ((index + 1) % 100 === 0) {
      onProgress?.(`armor ${index + 1}/${models.length}`);
    }
  }

  return counts;
};

export const purgeArmorModels = async ({ prisma, storage }: PurgeArmorModelsInput): Promise<number> => {
  const rows = await prisma.vehicleArmorModel.findMany({ select: { storageKey: true } });

  for (const { storageKey } of rows) {
    await storage.remove(storageKey);
  }

  const { count } = await prisma.vehicleArmorModel.deleteMany({});

  return count;
};
