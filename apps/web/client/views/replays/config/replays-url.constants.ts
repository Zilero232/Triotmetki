import { NATIONS, TANK_CLASSES } from '@otmetki/icons';
import { REPLAY_TAGS } from '@otmetki/schemas';
import { parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

import { REPLAY_LIST, REPLAY_RESULTS, REPLAY_SORTS, REPLAY_TABS } from './replays-list.constants';

export const REPLAYS_URL_PARSERS = {
  tab: parseAsStringLiteral(REPLAY_TABS).withDefault(REPLAY_LIST.defaultTab),
  tank: parseAsInteger,
  map: parseAsString,
  mode: parseAsString,
  player: parseAsString.withDefault(''),
  clan: parseAsString.withDefault(''),
  result: parseAsStringLiteral(REPLAY_RESULTS),
  tiers: parseAsArrayOf(parseAsInteger).withDefault([]),
  types: parseAsArrayOf(parseAsStringLiteral(TANK_CLASSES)).withDefault([]),
  nations: parseAsArrayOf(parseAsStringLiteral(NATIONS)).withDefault([]),
  minDamage: parseAsInteger,
  minAssist: parseAsInteger,
  minBlocked: parseAsInteger,
  minFrags: parseAsInteger,
  mastery: parseAsInteger,
  version: parseAsString,
  tags: parseAsArrayOf(parseAsStringLiteral(REPLAY_TAGS)).withDefault([]),
  sort: parseAsStringLiteral(REPLAY_SORTS).withDefault(REPLAY_LIST.defaultSort)
} as const;
