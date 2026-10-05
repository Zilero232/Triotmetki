import type { VehicleSummary } from '@otmetki/schemas';

import { isObjectType, isString } from 'remeda';

import type { ReadUrlInput, ToVehicleSummaryInput } from './vehicle-summary.types';

import { VEHICLE_TYPE_FROM_DB } from '../../../common/lib';
import { vehicleRenderUrl } from '../../gamedata';
import { IMAGE_KEYS } from '../config/vehicle-images.constants';

const readUrl = ({ images, keys }: ReadUrlInput): string | null => {
  if (!isObjectType(images)) {
    return null;
  }

  for (const key of keys) {
    const value: unknown = Reflect.get(images, key);

    if (isString(value) && URL.canParse(value)) {
      return value;
    }
  }

  return null;
};

export const toVehicleSummary = ({ row, status }: ToVehicleSummaryInput): VehicleSummary => ({
  tankId: row.tankId,
  name: row.name,
  shortName: row.shortName,
  slug: row.slug,
  nation: row.nation,
  type: VEHICLE_TYPE_FROM_DB[row.type],
  tier: row.tier,
  isPremium: row.isPremium,
  isCollectible: row.isCollectible,
  status,
  images: {
    small: readUrl({ images: row.images, keys: IMAGE_KEYS.small }),
    contour: readUrl({ images: row.images, keys: IMAGE_KEYS.contour }),
    big: readUrl({ images: row.images, keys: IMAGE_KEYS.big }),
    large: row.tag ? vehicleRenderUrl(row.tag) : null
  }
});

export const unknownVehicle = (tankId: number): VehicleSummary => ({
  tankId,
  name: `#${tankId}`,
  shortName: `#${tankId}`,
  slug: String(tankId),
  nation: 'unknown',
  type: 'mediumTank',
  tier: 1,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null, large: null }
});
