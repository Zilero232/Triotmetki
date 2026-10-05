import type { RouteMeta } from '@/shared/seo';

import { lookupRouteMeta, routeMeta } from '@/shared/seo/server';

import type { CompetitionRouteMeta } from './route-meta.types';

import { getCompetition } from '../competitions';

const lookupCompetitionMeta = async (slug: string) => {
  'use cache';

  return lookupRouteMeta(async () => {
    const { title, visibility } = await getCompetition({ slug });

    return { title, isPublic: visibility === 'public' };
  });
};

export const competitionRouteMeta = async (slug: string): Promise<RouteMeta<CompetitionRouteMeta>> => routeMeta(lookupCompetitionMeta(slug));
