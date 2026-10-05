import type { ModSessionSharePreferenceAnswer, ModSessionShareSent } from '@otmetki/schemas';

import type { ShareChannel } from '../../../generated';

export type { ModSessionSharePreferenceAnswer, ModSessionShareSent };

export type EnqueueShareInput = {
  userId: string;
  sessionId: string;
  channels: readonly ShareChannel[];
  isAutomatic?: boolean;
};

export type SavePreferenceInput = {
  userId: string;
  accountId: bigint;
  enabled: boolean;
  channels: ShareChannel[];
};

export type SendShareInput = {
  userId: string;
  accountId: bigint;
  modSessionId: string;
  channels: ShareChannel[];
};

export type AssertLinkedInput = {
  userId: string;
  channels: readonly ShareChannel[];
};

export type SendDiscordOnceInput = {
  key: string;
  send: () => Promise<unknown>;
};
