import type { PlayerHistoryEntry } from '@otmetki/schemas';

import type { PlayerNickname } from '../../../../generated';
import type { ToClanHistoryEntryInput } from './player-history.types';

import { toIso } from '../../../common/lib';

export const toNicknameHistoryEntry = (entry: PlayerNickname): PlayerHistoryEntry => ({
  kind: 'nickname',
  value: entry.nickname,
  from: toIso(entry.firstSeenAt),
  to: toIso(entry.lastSeenAt)
});

export const toClanHistoryEntry = ({ entry, tag }: ToClanHistoryEntryInput): PlayerHistoryEntry => ({
  kind: 'clan',
  value: tag ?? String(entry.clanId),
  from: toIso(entry.joinedAt),
  to: toIso(entry.leftAt)
});
