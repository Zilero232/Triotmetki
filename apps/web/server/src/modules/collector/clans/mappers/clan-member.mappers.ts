import { fromUnixTime } from 'date-fns';

import type { Prisma } from '../../../../../generated';
import type { ClanMember } from '../../../../lib/lesta';
import type { CurrentMember } from '../lib/clan-roster/clan-roster.types';
import type { ToClanHistoryRecordInput, ToPopulationPlayerInput } from './clan-member.types';

import { clanRoleToDb } from '../../../../common/lib';
import { CLANS } from '../config/clans.constants';

export const toClanHistoryRecord = ({ accountId, entry }: ToClanHistoryRecordInput): Prisma.PlayerClanHistoryCreateManyInput => ({
  accountId,
  clanId: BigInt(entry.clan_id),
  role: entry.role ? clanRoleToDb(entry.role) : null,
  joinedAt: fromUnixTime(entry.joined_at),
  leftAt: entry.left_at ? fromUnixTime(entry.left_at) : null
});

export const toCurrentMember = (member: ClanMember): CurrentMember => ({
  accountId: BigInt(member.account_id),
  role: clanRoleToDb(member.role) ?? CLANS.defaultRole,
  joinedAt: member.joined_at ? fromUnixTime(member.joined_at) : null
});

export const toPopulationPlayer = ({ member, nickname, clanId }: ToPopulationPlayerInput): Prisma.PlayerCreateManyInput => ({
  accountId: member.accountId,
  nickname: nickname ?? String(member.accountId),
  clanId,
  trackingTier: 'population'
});
