import type { RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteEntity, routeEntity, routeSlugs } from '@/shared/seo/server';

import type { TankCollectionSlug } from '../../lib/tank-collections';

import { TANK_DETAIL } from '../../config';
import { collectionVehicles } from '../../lib/tank-collections';
import { getTank, listTankStats, listVehicles } from '../tanks';

const lookupTank = async (idOrSlug: string) => {
  'use cache';

  return lookupRouteEntity({
    key: idOrSlug,
    load: async () => {
      const { vehicle } = await getTank({ idOrSlug, period: TANK_DETAIL.period });

      return { name: vehicle.name, key: vehicle.slug };
    }
  });
};

export const tankRouteEntity = async (idOrSlug: string) => routeEntity({ key: idOrSlug, lookup: lookupTank });

export const topTankSlugs = async ({ fallback, limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({
    fallback,
    load: async () => (await listTankStats({ limit })).items.map(({ vehicle }) => vehicle.slug)
  });
};

export const vehicleSlugs = async () => {
  'use cache';

  return routeSlugs({ load: async () => (await listVehicles({})).map(({ slug }) => slug) });
};

export const tankCollectionItems = async (slug: TankCollectionSlug) => {
  'use cache';

  try {
    return collectionVehicles({ catalog: await listVehicles({}), slug }).map(({ name, slug: vehicleSlug }) => ({ name, slug: vehicleSlug }));
  } catch {
    return null;
  }
};
