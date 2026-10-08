import type { RouteStaticParamsInput } from '@/shared/seo';

import { streamersControllerList } from '@/shared/api/generated';
import { fromSdk } from '@/shared/api/source';
import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteEntity, routeEntity, routeSlugs } from '@/shared/seo/server';

import { getStreamerBySlug } from '../streamers';

const lookupStreamer = async (slug: string) => {
  'use cache';

  return lookupRouteEntity({
    key: slug,
    load: async () => {
      const streamer = await getStreamerBySlug(slug);

      return { name: streamer.displayName, key: streamer.slug };
    }
  });
};

export const streamerRouteEntity = async (slug: string) => routeEntity({ key: slug, lookup: lookupStreamer });

export const streamerSlugs = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({ load: async () => (await fromSdk(() => streamersControllerList({ query: { limit } }))).items.map(({ slug }) => slug) });
};
