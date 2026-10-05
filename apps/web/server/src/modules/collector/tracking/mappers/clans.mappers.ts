import { fromUnixTime } from 'date-fns';

import type { Prisma } from '../../../../../generated';
import type { ClanListItem } from '../../../../lib/lesta';

export const toClanRecord = (clan: ClanListItem): Prisma.ClanCreateManyInput => ({
  clanId: BigInt(clan.clan_id),
  tag: clan.tag,
  name: clan.name,
  color: clan.color ?? null,
  membersCount: clan.members_count,
  createdAt: fromUnixTime(clan.created_at)
});
