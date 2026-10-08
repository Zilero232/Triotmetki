import type { RatingScale } from '@otmetki/ratings';

export const RATINGS_PAGE = {
  percent: 100,
  scaleAnchor: 'scale'
} as const;

export const RATINGS_SOURCES = {
  xvm: 'https://modxvm.com/',
  wn8Expected: 'https://static.modxvm.com/wn8-data-exp/json/lesta/wn8exp.json'
} as const;

export const RATING_SCALE_COLUMNS = ['wn8', 'eff', 'winRate', 'bronyaIndex'] as const satisfies readonly RatingScale[];

export const METHOD_SECTIONS = ['wn8', 'eff', 'bronyaIndex', 'marks', 'mastery'] as const;
