import type { DiscordStatus, VkStatus } from '@otmetki/schemas';

import type { BOT_PROVIDERS } from '../../config';

export type BotProvider = (typeof BOT_PROVIDERS)[number];

export type LinkBotInput = {
  provider: BotProvider;
  callbackURL: string;
};

export type UnlinkBotInput = {
  accountId: string;
};

export type BotLinks = {
  discord: DiscordStatus & { accountId: string | null };
  vk: VkStatus & { accountId: string | null };
};
