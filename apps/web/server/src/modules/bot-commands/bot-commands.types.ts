import type { MoeThresholdValues } from '@otmetki/schemas';

import type { BOT_LOCALE, SHARED_COMMANDS } from './config/bot-commands.constants';

export type BotLocale = (typeof BOT_LOCALE.locales)[number];

type SharedCommand = (typeof SHARED_COMMANDS)[number];

export type PlayerCard = {
  accountId: bigint;
  nickname: string;
  battles: number;
  winRate: number | null;
  avgDamage: number | null;
  wn8: number | null;
  clanTag: string | null;
};

export type SessionCard = {
  battles: number;
  wins: number;
  avgDamage: number;
  wn8: number | null;
  startedAt: Date;
  isOpen: boolean;
};

type MarkLine = {
  tankName: string;
  marks: number;
  percent: number;
};

export type MarksCard = {
  moe3: number;
  moe2: number;
  moe1: number;
  closest: MarkLine[];
};

export type ClanCard = {
  tag: string;
  name: string;
  membersCount: number;
  role: string;
};

export type TankCard = {
  tankId: number;
  name: string;
  tier: number;
  type: string;
  slug: string;
  moe: Omit<MoeThresholdValues, 'p100'> | null;
};

export type TopLine = {
  nickname: string;
  wn8: number;
  battles: number;
};

export type LinkUrlInput = {
  webUrl: string;
  path: string;
};

export type PlayerUrlInput = {
  webUrl: string;
  nickname: string;
};

export type StatCardUrlInput = {
  webUrl: string;
  accountId: bigint;
};

export type FindTanksInput<T> = {
  entries: readonly T[];
  query: string;
  limit: number;
  names: (entry: T) => readonly string[];
};

export type BotLink = {
  label: string;
  url: string;
};

export type BotReply = {
  text: string;
  link: BotLink | null;
  imageUrl: string | null;
};

export type BotReplyInput = {
  command: SharedCommand;
  locale: BotLocale;
  accountId: bigint | null;
  argument: string;
};

export type CommandReplyInput = Omit<BotReplyInput, 'command'>;

export type FailureInput = {
  locale: BotLocale;
  error: unknown;
};

export type PlayerTextInput = {
  locale: BotLocale;
  card: PlayerCard;
};

export type TranslateInput = {
  locale: BotLocale;
  key: string;
  vars?: Record<string, number | string>;
};

export type LinkedBotUser = {
  userId: string;
  accountId: bigint | null;
  nickname: string | null;
  locale: BotLocale;
};

export type FindLinkedInput = {
  providerId: string;
  externalId: string;
  languageHint?: string | null;
};

export type LocalizedLinkInput = {
  locale: BotLocale;
  url: string;
};
