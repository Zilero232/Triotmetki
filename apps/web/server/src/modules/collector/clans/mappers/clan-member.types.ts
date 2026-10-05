import type { ClanMemberHistoryEntry } from '../../../../lib/lesta';
import type { CurrentMember } from '../lib/clan-roster';

export type ToClanHistoryRecordInput = {
  accountId: bigint;
  entry: ClanMemberHistoryEntry;
};

export type ToPopulationPlayerInput = {
  member: CurrentMember;
  nickname: string | undefined;
  clanId: bigint;
};
