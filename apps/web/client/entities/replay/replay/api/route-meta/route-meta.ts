import type { RouteMeta, RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteMeta, routeMeta, routeSlugs } from '@/shared/seo/server';

import type { ReplayRouteMeta } from './route-meta.types';

import { getReplay, listReplays } from '../replays';

const lookupReplayMeta = async (id: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { visibility, status, owner, mapName, damageDealt } = await getReplay({ id });

    return { isPublic: visibility === 'public' && status === 'parsed', player: owner?.nickname ?? null, mapName, damageDealt };
  });
};

export const replayRouteMeta = async (id: string): Promise<RouteMeta<ReplayRouteMeta>> => routeMeta(lookupReplayMeta(id));

export const publicReplayIds = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({ load: async () => (await listReplays({ limit, sort: 'views' })).items.map(({ id }) => id) });
};
