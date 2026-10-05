import type { z } from 'zod';

import type {
  cosmeticGradeSchema,
  cosmeticInventoryItemSchema,
  cosmeticsInventorySchema,
  cosmeticSlotSchema,
  cosmeticSourceSchema,
  equipCosmeticsSchema,
  equippedCosmeticsSchema,
  profileCosmeticSlotSchema,
  profileCosmeticsSchema
} from './cosmetics.schemas';

export type CosmeticSlot = z.infer<typeof cosmeticSlotSchema>;
export type ProfileCosmeticSlot = z.infer<typeof profileCosmeticSlotSchema>;
export type CosmeticSource = z.infer<typeof cosmeticSourceSchema>;
export type CosmeticGrade = z.infer<typeof cosmeticGradeSchema>;
export type CosmeticInventoryItem = z.infer<typeof cosmeticInventoryItemSchema>;
export type CosmeticsInventory = z.infer<typeof cosmeticsInventorySchema>;
export type EquippedCosmetics = z.infer<typeof equippedCosmeticsSchema>;
export type EquipCosmeticsInput = z.infer<typeof equipCosmeticsSchema>;
export type ProfileCosmetics = z.infer<typeof profileCosmeticsSchema>;
export type CosmeticItem = {
  code: string;
  slot: CosmeticSlot;
  source: CosmeticSource;
  price: number | null;
  season: string | null;
  grade: CosmeticGrade | null;
};

export type SeasonalCosmeticInput = {
  season: string;
  slot: ProfileCosmeticSlot;
  grade: CosmeticGrade;
};
