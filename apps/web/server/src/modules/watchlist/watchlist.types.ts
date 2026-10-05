import type { AddWatchlistPlayerInput, UpdateWatchlistSettingsInput, WatchlistQuery } from '@otmetki/schemas';

import type { NotificationSettings } from '../../../generated';
import type { BotContext } from '../telegram';

export type WatchlistListInput = {
  userId: string;
  query: WatchlistQuery;
};

export type WatchlistAddInput = AddWatchlistPlayerInput & {
  userId: string;
};

export type WatchCommandAddInput = {
  ctx: BotContext;
  userId: string;
  nickname: string;
};

export type WatchlistRemoveInput = {
  userId: string;
  accountId: number;
};

export type WatchlistSettingsInput = UpdateWatchlistSettingsInput & {
  userId: string;
};

export type PlayerActivityInput = {
  accountIds: readonly bigint[];
  since: Date;
};

export type PlayerActivityRow = {
  accountId: bigint;
  battles: number;
  wins: number;
  damage: number;
  lastBattleAt: Date | null;
  marksGained: number;
};

type DigestSettings = Pick<NotificationSettings, 'userId' | 'watchlistDigest' | 'watchlistDigestAt'>;

export type DigestForInput = {
  settings: DigestSettings;
  now: Date;
};
