import type { AchievementRarityItem } from '../achievements-rarity.types';
import type { AchievementItemInput } from './catalog.types';

import { ACHIEVEMENTS_VIEW } from '../config/view.constants';
import { rarityTier } from '../lib/rarity/rarity';

export const toAchievementItem = ({ row, rarity }: AchievementItemInput): AchievementRarityItem => ({
  name: row.name,
  title: row.title,
  titleEn: row.titleEn,
  description: row.description,
  descriptionEn: row.descriptionEn,
  section: row.section,
  image: row.image,
  holders: rarity?.holders ?? 0,
  share: rarity ? rarity.share * ACHIEVEMENTS_VIEW.percentScale : null,
  points: rarity?.points ?? null,
  tier: rarity ? rarityTier(rarity.share) : null
});
