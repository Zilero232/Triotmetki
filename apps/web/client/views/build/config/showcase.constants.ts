import { BUILD_USAGE } from '@otmetki/schemas';
import { parseAsStringLiteral } from 'nuqs/server';

export const SHOWCASE = {
  sources: ['top10', 'all', 'top1'],
  plusSources: ['top1'],
  plusFeature: 'analytics',
  otherSource: { top10: 'all', all: 'top10', top1: 'all' },
  views: ['showcase', 'editor'],
  mode: BUILD_USAGE.defaultMode,
  statsCohort: 'all',
  statsMode: 'random',
  skillsPerRole: 7,
  consumables: 3,
  slide: { type: 'spring', stiffness: 500, damping: 40 }
} as const;

export const SHOWCASE_PARSERS = {
  source: parseAsStringLiteral(SHOWCASE.sources).withDefault('top10'),
  view: parseAsStringLiteral(SHOWCASE.views)
} as const;
