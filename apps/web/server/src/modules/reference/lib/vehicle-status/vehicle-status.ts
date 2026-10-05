import type { TankRole, TankStatus } from '@otmetki/schemas';

import { TANK_ROLES } from '@otmetki/schemas';
import { isIncludedIn } from 'remeda';
import { z } from 'zod';

import type { ClassifyVehicleInput, SpecTraits } from './vehicle-status.types';

import { VEHICLE_STATUS } from '../../config/vehicle-status.constants';

const specTraitsSchema = z.object({
  tags: z.array(z.string()).catch([]),
  role: z.string().nullish().catch(null),
  notInShop: z.boolean().catch(false)
});

const SOURCE_TAGS = Object.keys(VEHICLE_STATUS.sourceTags);

export const readSpecTraits = (specs: unknown): SpecTraits => {
  const parsed = specTraitsSchema.safeParse(specs);

  return parsed.success
    ? { tags: parsed.data.tags, role: parsed.data.role ?? null, notInShop: parsed.data.notInShop }
    : { tags: [], role: null, notInShop: false };
};

export const toTankRole = (role: string | null): TankRole | null => {
  if (!role?.startsWith(VEHICLE_STATUS.rolePrefix)) {
    return null;
  }

  const name = role.slice(VEHICLE_STATUS.rolePrefix.length);

  return isIncludedIn(name, TANK_ROLES) ? name : null;
};

export const isPreferentialVehicle = (spec: Pick<SpecTraits, 'tags'>): boolean => spec.tags.includes(VEHICLE_STATUS.preferentialTag);

const hasRewardTag = (tags: readonly string[]): boolean =>
  tags.some((tag) => isIncludedIn(tag, VEHICLE_STATUS.rewardTags) || SOURCE_TAGS.includes(tag));

export const classifyVehicle = ({ summary, spec, hasOffers }: ClassifyVehicleInput): TankStatus => {
  if (summary.isCollectible) {
    return 'collector';
  }

  if (!summary.isPremium) {
    return spec.notInShop ? 'removed' : 'researchable';
  }

  if (!spec.notInShop || hasOffers) {
    return 'premium';
  }

  return summary.tier >= VEHICLE_STATUS.rewardMinTier || hasRewardTag(spec.tags) ? 'reward' : 'premium';
};
