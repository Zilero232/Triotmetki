import type { AbstractIntlMessages } from 'next-intl';

export type MessageNode = string | AbstractIntlMessages;

export type PickMessagesInput = {
  messages: AbstractIntlMessages;
  paths: readonly string[];
};

export type ValueAtInput = {
  messages: AbstractIntlMessages;
  segments: readonly string[];
};

export type NestMessagesInput = {
  segments: readonly string[];
  value: MessageNode;
};

export type MergeMessagesInput = {
  target: AbstractIntlMessages;
  source: AbstractIntlMessages;
};
