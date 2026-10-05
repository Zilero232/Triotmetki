import type { ClanListItem, ClanMember, ClanMemberEvent, ClanSummary } from '@otmetki/schemas';

import { differenceInDays } from 'date-fns';

import type { ClanListRow } from '../queries/clan-list.types';
import type { ClanSummaryRow, ToClanEventInput, ToClanMemberInput } from './clans.types';

import { clampPercent, CLAN_ROLE_FROM_DB, clanEmblem, emptyRating, ratingValue, toIso, toNumber } from '../../../common/lib';
import { CLAN_PAGE } from '../config/clan-page.constants';

export const toClanSummary = (clan: ClanSummaryRow): ClanSummary => ({
  clanId: toNumber(clan.clanId),
  tag: clan.tag,
  name: clan.name,
  color: clan.color,
  motto: clan.motto,
  emblem: clanEmblem(clan.emblems),
  membersCount: clan.membersCount,
  createdAt: toIso(clan.createdAt),
  isDisbanded: clan.isDisbanded
});

export const toClanListItem = (row: ClanListRow): ClanListItem => ({
  clan: toClanSummary(row),
  avgWn8: ratingValue({ kind: 'wn8', value: row.avgWn8 }),
  avgWinRate: clampPercent(row.avgWinRate),
  activeMembers7d: row.activeMembers7d,
  eloRating10: row.eloRating10,
  strongholdLevel: row.strongholdLevel
});

export const toClanEvent = ({ row, nickname }: ToClanEventInput): ClanMemberEvent => ({
  accountId: toNumber(row.accountId),
  nickname,
  type: row.type === 'roleChanged' ? 'role_changed' : row.type,
  oldRole: row.oldRole ? CLAN_ROLE_FROM_DB[row.oldRole] : null,
  newRole: row.newRole ? CLAN_ROLE_FROM_DB[row.newRole] : null,
  occurredAt: row.occurredAt.toISOString()
});

export const toClanMember = ({ row, now }: ToClanMemberInput): ClanMember => {
  const overall = row.player.ratings.find((rating) => rating.period === 'overall');
  const recent = row.player.ratings.find((rating) => rating.period === CLAN_PAGE.recentPeriod);
  const lastBattleAt = row.player.lastBattleAt;

  return {
    accountId: toNumber(row.accountId),
    nickname: row.player.nickname,
    role: CLAN_ROLE_FROM_DB[row.role],
    joinedAt: toIso(row.joinedAt),
    lastBattleAt: toIso(lastBattleAt),
    inactiveDays: lastBattleAt ? Math.max(0, differenceInDays(now, lastBattleAt)) : null,
    battles: overall?.battles ?? null,
    winRate: clampPercent(overall?.winRate),
    wn8: overall ? ratingValue({ kind: 'wn8', value: overall.wn8 }) : emptyRating(),
    recentWn8: recent ? ratingValue({ kind: 'wn8', value: recent.wn8 }) : emptyRating()
  };
};
