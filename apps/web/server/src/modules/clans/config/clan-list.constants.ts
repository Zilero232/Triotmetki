import type { ClanListSortField } from '@otmetki/schemas';

export const CLAN_LIST_SORT = {
  members: 'clan.members_count',
  wn8: 'latest.avg_wn8',
  winRate: 'latest.avg_win_rate',
  eloRating10: 'latest.elo_rating_10',
  strongholdLevel: 'clan.stronghold_level',
  activeMembers: 'latest.active_members_7d'
} as const satisfies Record<ClanListSortField, string>;

export const CLAN_LIST_DEFAULT_SORT = 'members' satisfies ClanListSortField;
