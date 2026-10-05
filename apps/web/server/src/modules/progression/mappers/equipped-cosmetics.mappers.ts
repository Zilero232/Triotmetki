import type { EquipCosmeticsInput, EquippedCosmetics } from '@otmetki/schemas';

import type { Prisma } from '../../../../generated';
import type { EquippedCosmeticsRow } from '../selects/equipped-cosmetics.types';

export const toEquippedCosmetics = (row: EquippedCosmeticsRow): EquippedCosmetics => ({
  badge: row.cosmeticBadge,
  frame: row.cosmeticFrame,
  banner: row.cosmeticBanner
});

export const toCosmeticColumns = (patch: EquipCosmeticsInput): Prisma.UserUpdateInput => ({
  cosmeticBadge: patch.badge,
  cosmeticFrame: patch.frame,
  cosmeticBanner: patch.banner
});
