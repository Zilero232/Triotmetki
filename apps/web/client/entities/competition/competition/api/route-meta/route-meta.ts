import type { RouteMeta, RouteStaticParamsInput } from '@/shared/seo';

import { ROUTE_STATIC_PARAMS } from '@/shared/seo';
import { lookupRouteMeta, routeMeta, routeSlugs } from '@/shared/seo/server';

import type { CompetitionRouteMeta } from './route-meta.types';

import { getCompetition, listCompetitions } from '../competitions';

const lookupCompetitionMeta = async (slug: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { title, visibility } = await getCompetition({ slug });

    return { title, isPublic: visibility === 'public' };
  });
};

export const competitionRouteMeta = async (slug: string): Promise<RouteMeta<CompetitionRouteMeta>> => routeMeta(lookupCompetitionMeta(slug));

export const competitionSlugs = async ({ limit = ROUTE_STATIC_PARAMS.limit }: RouteStaticParamsInput) => {
  'use cache';

  return routeSlugs({
    load: async () => {
      const { items } = await listCompetitions({ limit, offset: 0 });

      return items.flatMap(({ slug, visibility }) => (visibility === 'public' ? [slug] : []));
    }
  });
};
