import type { z } from 'zod';

import type { AccountAchievements, Achievement, Prisma } from '../../../generated';
import type {
  achievementRarityItemSchema,
  achievementsCatalogSchema,
  achievementsQuerySchema,
  collectorRowSchema,
  collectorsQuerySchema,
  collectorsSchema,
  heldAchievementSchema,
  playerCollectionSchema,
  tankRarityItemSchema,
  tankRarityQuerySchema,
  tankRaritySchema
} from './dto/achievements-rarity.schemas';
import type { ObtainableRow } from './lib/account-rollup/account-rollup.types';
import type { COLLECTOR_ROW_SELECT, PLAYER_COLLECTION_SELECT } from './selects/collectors.selects';

export type AchievementsQuery = z.infer<typeof achievementsQuerySchema>;

export type AchievementRarityItem = z.infer<typeof achievementRarityItemSchema>;

export type AchievementsCatalog = z.infer<typeof achievementsCatalogSchema>;

export type TankRarityQuery = z.infer<typeof tankRarityQuerySchema>;

export type TankRarityItem = z.infer<typeof tankRarityItemSchema>;

export type TankRarityView = z.infer<typeof tankRaritySchema>;

export type CollectorsQuery = z.infer<typeof collectorsQuerySchema>;

export type CollectorRow = z.infer<typeof collectorRowSchema>;

export type CollectorsView = z.infer<typeof collectorsSchema>;

export type HeldAchievement = z.infer<typeof heldAchievementSchema>;

export type PlayerCollection = z.infer<typeof playerCollectionSchema>;

export type CatalogRow = Pick<Achievement, 'description' | 'descriptionEn' | 'image' | 'name' | 'order' | 'section' | 'title' | 'titleEn'>;

export type CatalogEntry = {
  item: AchievementRarityItem;
  order: number | null;
  sample: number;
  computedAt: Date | null;
};

export type StoredCountsRow = Pick<AccountAchievements, 'accountId' | 'counts'>;

export type AchievementsFetchResult = {
  requested: number;
  stored: number;
};

export type RarityAggregateResult = {
  sample: number;
  achievements: number;
  tanks: number;
};

export type WriteAchievementsInput = {
  catalog: ObtainableRow[];
  holders: ReadonlyMap<string, number>;
  sample: number;
  now: Date;
};

export type PlayerCollectionInput = {
  accountId: bigint;
  viewerUserId: string | null;
};

export type CollectorPageRow = Prisma.AccountAchievementsGetPayload<{ select: typeof COLLECTOR_ROW_SELECT }>;

export type VisiblePlayer = Prisma.PlayerGetPayload<{ select: typeof PLAYER_COLLECTION_SELECT }>;
