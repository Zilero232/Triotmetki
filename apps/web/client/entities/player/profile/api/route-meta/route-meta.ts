import type { RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteEntity, routeEntity, routeSlugs } from '@/shared/seo/server';

import { getPlayer, getPopularPlayers } from '../players';

const lookupPlayer = async (idOrNick: string) => {
  'use cache';

  return lookupRouteEntity({
    key: idOrNick,
    load: async () => {
      const { nickname } = (await getPlayer({ idOrNick })).summary;

      return { name: nickname, key: nickname };
    }
  });
};

export const playerRouteEntity = async (idOrNick: string) => routeEntity({ key: idOrNick, lookup: lookupPlayer });

export const popularNicknames = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({ load: async () => (await getPopularPlayers({ limit })).items.map(({ nickname }) => nickname) });
};
