import type { PrismaClient } from '../../../../../../generated';
import type { CollectedArmorModels } from '../collect/collect.types';
import type { ArmorStorage } from '../storage/storage.types';

export type WriteArmorModelsInput = {
  prisma: PrismaClient;
  storage: ArmorStorage;
  collected: CollectedArmorModels;
  onProgress?: (message: string) => void;
};

export type ArmorWriteCounts = {
  uploaded: number;
  unchanged: number;
  replaced: number;
};

export type PurgeArmorModelsInput = {
  prisma: PrismaClient;
  storage: ArmorStorage;
};
