import type { OverlayTheme } from '../streamers/streamers.types';
import type { CosmeticItem, SeasonalCosmeticInput } from './cosmetics.types';

import { OVERLAY_THEMES } from '../streamers/streamers.constants';
import { COSMETIC_CODE, COSMETIC_ITEMS } from './cosmetics.constants';
import { cosmeticGradeSchema, profileCosmeticSlotSchema } from './cosmetics.schemas';

const STATIC_ITEMS: ReadonlyMap<string, CosmeticItem> = new Map(COSMETIC_ITEMS.map((item) => [item.code, { ...item, season: null, grade: null }]));

const PREMIUM_THEMES: ReadonlySet<OverlayTheme> = new Set(OVERLAY_THEMES.premium);

export const seasonalCosmeticCode = ({ season, slot, grade }: SeasonalCosmeticInput): string => `season-${season}-${slot}-${grade}`;

export const cosmeticOf = (code: string): CosmeticItem | null => {
  const item = STATIC_ITEMS.get(code);

  if (item) {
    return item;
  }

  const [, season, slot, grade] = COSMETIC_CODE.seasonPattern.exec(code) ?? [];
  const parsedSlot = profileCosmeticSlotSchema.safeParse(slot);
  const parsedGrade = cosmeticGradeSchema.safeParse(grade);

  if (season === undefined || !parsedSlot.success || !parsedGrade.success) {
    return null;
  }

  return { code, slot: parsedSlot.data, source: 'season', price: null, season, grade: parsedGrade.data };
};

export const catalogCosmetics = (): CosmeticItem[] => [...STATIC_ITEMS.values()];

const isPremiumOverlayTheme = (theme: OverlayTheme): boolean => PREMIUM_THEMES.has(theme);

export const overlayThemeCosmetic = (theme: OverlayTheme): string | null =>
  isPremiumOverlayTheme(theme) ? `${COSMETIC_CODE.overlayPrefix}${theme}` : null;

export const isPurchasableCosmetic = (item: Pick<CosmeticItem, 'price' | 'source'>): boolean => item.source === 'shop' && item.price !== null;
