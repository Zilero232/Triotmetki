import type { RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteEntity, routeEntity, routeSlugs } from '@/shared/seo/server';

import { getClan, listClans } from '../clans';

const lookupClan = async (idOrTag: string) => {
  'use cache';

  return lookupRouteEntity({
    key: idOrTag,
    load: async () => {
      const { clan } = await getClan({ idOrTag });

      return { name: `[${clan.tag}] ${clan.name}`, key: clan.tag };
    }
  });
};

export const clanRouteEntity = async (idOrTag: string) => routeEntity({ key: idOrTag, lookup: lookupClan });

export const topClanTags = async ({ fallback, limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({
    fallback,
    load: async () => (await listClans({ limit })).items.map(({ clan }) => clan.tag)
  });
};
