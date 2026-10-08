import { authClient } from '@/shared/api/auth';
import { discordControllerStatus, vkControllerStatus } from '@/shared/api/generated';
import { fromAuth, fromSdk } from '@/shared/api/source';

import type { BotLinks, BotProvider, LinkBotInput, UnlinkBotInput } from './bots.types';

export const getBotLinks = async (): Promise<BotLinks> => {
  const [discord, vk, accounts] = await Promise.all([
    fromSdk(() => discordControllerStatus()),
    fromSdk(() => vkControllerStatus()),
    fromAuth(authClient.listAccounts())
  ]);

  const accountOf = (provider: BotProvider) => (accounts ?? []).find((account) => account.providerId === provider)?.accountId ?? null;

  return { discord: { ...discord, accountId: accountOf('discord') }, vk: { ...vk, accountId: accountOf('vk') } };
};

export const linkBotAccount = async ({ provider, callbackURL }: LinkBotInput): Promise<string | null> => {
  const result = await fromAuth(authClient.linkSocial({ provider, callbackURL }));

  return result?.url ?? null;
};

export const unlinkBotAccount = async ({ accountId }: UnlinkBotInput): Promise<void> => {
  await fromAuth(authClient.unlinkAccount({ accountId }));
};
