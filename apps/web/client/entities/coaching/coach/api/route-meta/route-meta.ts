import type { RouteMeta, RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteMeta, routeMeta, routeSlugs } from '@/shared/seo/server';

import type { CoachRouteMeta } from './route-meta.types';

import { getCoach, listCoaches } from '../coaching';

const lookupCoachMeta = async (userId: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { name, headline, isActive } = await getCoach({ userId });

    return { name, headline, isActive };
  });
};

export const coachRouteMeta = async (userId: string): Promise<RouteMeta<CoachRouteMeta>> => routeMeta(lookupCoachMeta(userId));

export const coachIds = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({ load: async () => (await listCoaches({ limit })).items.flatMap(({ userId, isActive }) => (isActive ? [userId] : [])) });
};
