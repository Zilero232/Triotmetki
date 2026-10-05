import type { ClanSearchResult, MapSearchResult, PlayerSearchResult } from '@otmetki/schemas';

import type { AccountListItem } from '../../../lib/lesta';
import type { ClanMatchRow, MapMatchRow, PlayerMatchRow } from '../queries/search.types';

import { clanEmblem, emptyRating, ratingValue } from '../../../common/lib';

export const toClanSearchResult = (row: ClanMatchRow): ClanSearchResult => ({
  kind: 'clan',
  clanId: row.clanId,
  tag: row.tag,
  name: row.name,
  membersCount: row.membersCount,
  emblem: clanEmblem(row.emblems)
});

export const toMapSearchResult = (row: MapMatchRow): MapSearchResult => ({
  kind: 'map',
  arenaId: row.arenaId,
  slug: row.slug,
  name: row.name,
  image: row.image && URL.canParse(row.image) ? row.image : null
});

export const toPlayerSearchResult = (row: PlayerMatchRow): PlayerSearchResult => ({
  kind: 'player',
  accountId: row.accountId,
  nickname: row.nickname,
  clanTag: row.clanTag,
  matchedNickname: row.matchedNickname,
  wn8: ratingValue({ kind: 'wn8', value: row.wn8 }),
  battles: row.battles
});

export const toDiscoveredPlayerResult = (item: AccountListItem): PlayerSearchResult => ({
  kind: 'player',
  accountId: item.account_id,
  nickname: item.nickname,
  clanTag: null,
  matchedNickname: null,
  wn8: emptyRating(),
  battles: null
});
