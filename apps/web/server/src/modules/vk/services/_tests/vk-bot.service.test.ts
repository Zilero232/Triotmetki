import type { VK } from 'vk-io';

import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Env } from '../../../../config';
import type { BotAccountsReaderService, BotRepliesService } from '../../../bot-commands';

import { AppConfigService } from '../../../../config';
import { VK_BOT } from '../../config/bot.constants';
import { VkBotService } from '../vk-bot.service';

const CALLBACK = { VK_CALLBACK_CONFIRMATION: 'confirm-code', VK_CALLBACK_SECRET: 'callback-secret' } satisfies Partial<Env>;

const createBot = (env: Partial<Env> = CALLBACK) => {
  const vk = mockDeep<VK>();
  const service = new VkBotService(
    vk,
    new AppConfigService(new ConfigService<Env, true>(env)),
    mock<BotAccountsReaderService>(),
    mock<BotRepliesService>()
  );

  return { vk, service };
};

describe('VkBotService.handleCallback', () => {
  it('answers the confirmation request with the configured code', async () => {
    const { service } = createBot();

    await expect(service.handleCallback({ type: VK_BOT.confirmationType })).resolves.toBe(CALLBACK.VK_CALLBACK_CONFIRMATION);
  });

  it('hands an event with the right secret to vk-io', async () => {
    const { vk, service } = createBot();
    const body = { type: 'message_new', secret: CALLBACK.VK_CALLBACK_SECRET };

    await expect(service.handleCallback(body)).resolves.toBe(VK_BOT.okResponse);
    expect(vk.updates.handleWebhookUpdate).toHaveBeenCalledWith(body);
  });

  it('acknowledges but drops an event with a wrong or missing secret', async () => {
    const { vk, service } = createBot();

    await expect(service.handleCallback({ type: 'message_new', secret: 'forged' })).resolves.toBe(VK_BOT.okResponse);
    await expect(service.handleCallback({ type: 'message_new' })).resolves.toBe(VK_BOT.okResponse);
    expect(vk.updates.handleWebhookUpdate).not.toHaveBeenCalled();
  });

  it('acknowledges and drops everything while the callback API is not configured', async () => {
    const { vk, service } = createBot({ VK_CALLBACK_CONFIRMATION: '', VK_CALLBACK_SECRET: '' });

    await expect(service.handleCallback({ type: VK_BOT.confirmationType })).resolves.toBe(VK_BOT.okResponse);
    expect(vk.updates.handleWebhookUpdate).not.toHaveBeenCalled();
  });
});
