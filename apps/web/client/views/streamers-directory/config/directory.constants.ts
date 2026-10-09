import { STREAMER_DIRECTORY, STREAMER_PLATFORMS } from '@otmetki/schemas';
import { parseAsBoolean, parseAsStringLiteral } from 'nuqs/server';

export const DIRECTORY_TOGGLES = ['live', 'settings'] as const;

export const DIRECTORY_PLATFORM_FILTERS = ['all', ...STREAMER_PLATFORMS] as const;

export const DIRECTORY_FILTER_PARSERS = {
  live: parseAsBoolean.withDefault(false),
  platform: parseAsStringLiteral(STREAMER_PLATFORMS),
  settings: parseAsBoolean.withDefault(false)
} as const;

export const DIRECTORY = {
  pageSize: STREAMER_DIRECTORY.defaultLimit,
  staleMs: 60_000,
  skeletons: [0, 1, 2, 3, 4, 5],
  skeletonHeight: 260,
  emblemSize: 480,
  emblemStroke: 1.25,
  favourites: 3,
  iconSize: 15,
  percentFormat: { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }
} as const;
