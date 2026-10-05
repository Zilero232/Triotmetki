import type { Prisma } from '../../../../generated';

export const CATALOG_ROW_SELECT = {
  name: true,
  section: true,
  title: true,
  titleEn: true,
  description: true,
  descriptionEn: true,
  image: true,
  order: true
} as const satisfies Prisma.AchievementSelect;

export const RARITY_ROW_SELECT = {
  name: true,
  holders: true,
  points: true,
  share: true,
  sample: true,
  computedAt: true
} as const satisfies Prisma.AchievementRaritySelect;
