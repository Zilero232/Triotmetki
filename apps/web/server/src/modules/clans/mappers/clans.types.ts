import type { Clan, ClanMemberEvent } from '../../../../generated';
import type { ClanMemberRow } from '../selects/clans.selects';

export type ClanSummaryRow = Pick<Clan, 'color' | 'createdAt' | 'isDisbanded' | 'membersCount' | 'motto' | 'name' | 'tag'> & {
  clanId: bigint | number;
  emblems: unknown;
};

export type ToClanEventInput = {
  row: ClanMemberEvent;
  nickname: string | null;
};

export type ToClanMemberInput = {
  row: ClanMemberRow;
  now: Date;
};
