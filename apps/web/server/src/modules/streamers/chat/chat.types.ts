import type { ChatClient } from '@twurple/chat';

import type { StreamerProvider } from '../../../../generated';
import type { ChatCommand } from './lib/chat-command';
import type { ChatMessage, ChatValues } from './lib/chat-copy';

export type ChallengeAnnouncement = {
  streamerUserId: string;
  text: string;
};

export type ChatAnnouncer = {
  readonly provider: StreamerProvider;
  announce: (input: ChallengeAnnouncement) => Promise<void>;
};

export type ChatReplyInput = {
  streamerUserId: string;
  command: ChatCommand;
};

export type StreamerTextInput = {
  streamerUserId: string;
  message: ChatMessage;
  values: ChatValues;
};

export type TwitchConnection = {
  client: ChatClient;
  login: string;
  externalId: string;
};

export type ChatMessageInput = {
  userId: string;
  client: ChatClient;
  channel: string;
  text: string;
};
