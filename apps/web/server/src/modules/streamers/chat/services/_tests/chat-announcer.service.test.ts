import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TwitchChatService } from '../twitch-chat.service';
import type { VkLiveChatService } from '../vk-live-chat.service';

import { ChatAnnouncerService } from '../chat-announcer.service';

const announcement = { streamerUserId: 'streamer-1', text: 'Челлендж выполнен' };

const createService = () => {
  const twitch = mock<TwitchChatService>({ provider: 'twitch' });
  const vk = mock<VkLiveChatService>({ provider: 'vkPlayLive' });

  twitch.announce.mockResolvedValue(undefined);
  vk.announce.mockResolvedValue(undefined);

  return { service: new ChatAnnouncerService(twitch, vk), twitch, vk };
};

describe('ChatAnnouncerService.announce', () => {
  it('sends the announcement to every chat provider', async () => {
    const { service, twitch, vk } = createService();

    await service.announce(announcement);

    expect(twitch.announce).toHaveBeenCalledWith(announcement);
    expect(vk.announce).toHaveBeenCalledWith(announcement);
  });

  it('still reaches the other providers when one chat fails, and logs the failing provider', async () => {
    const { service, twitch, vk } = createService();
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    twitch.announce.mockRejectedValue(new Error('irc closed'));

    await expect(service.announce(announcement)).resolves.toBeUndefined();
    expect(vk.announce).toHaveBeenCalledWith(announcement);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('twitch'));
  });
});
