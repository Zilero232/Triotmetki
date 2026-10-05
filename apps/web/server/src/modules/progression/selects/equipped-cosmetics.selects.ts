import type { Prisma } from '../../../../generated';

export const EQUIPPED_COSMETICS_SELECT = {
  cosmeticBadge: true,
  cosmeticFrame: true,
  cosmeticBanner: true
} as const satisfies Prisma.UserSelect;
