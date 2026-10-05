import type { I18n } from '@grammyjs/i18n';
import type { Bot } from 'grammy';
import type { Update } from 'grammy/types';

import { ConfigService } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Env } from '../../../../config/env';
import type { BotContext } from '../../telegram.types';
import type { TelegramChatService } from '../telegram-chat.service';
import type { TelegramCommandRegistry } from '../telegram-command-registry.service';
import type { TelegramCommandsService } from '../telegram-commands.service';
import type { TelegramInlineService } from '../telegram-inline.service';
import type { TelegramSettingsService } from '../telegram-settings.service';

import { AppConfigService } from '../../../../config';
import { TelegramBotService } from '../telegram-bot.service';

const SECRET = 'webhook-secret-of-the-bot';
const update = mock<Update>({ update_id: 1 });

const createBot = (secret = SECRET) => {
  const bot = mockDeep<Bot<BotContext>>();
  const service = new TelegramBotService(
    bot,
    mock<I18n<BotContext>>(),
    new AppConfigService(new ConfigService<Env, true>({ TELEGRAM_WEBHOOK_SECRET: secret })),
    mock<TelegramChatService>(),
    mock<TelegramCommandsService>({ commands: [] }),
    mock<TelegramInlineService>(),
    mock<TelegramSettingsService>(),
    mock<TelegramCommandRegistry>(),
    new RedisMock()
  );

  return { bot, service };
};

describe('TelegramBotService.handleWebhook', () => {
  it('hands an update with the right secret to the bot', async () => {
    const { bot, service } = createBot();

    await service.handleWebhook({ update, secret: SECRET });

    await vi.waitFor(() => expect(bot.handleUpdate).toHaveBeenCalledWith(update));
  });

  it('acknowledges the webhook without waiting for the bot to finish the update', async () => {
    const { bot, service } = createBot();

    bot.handleUpdate.mockReturnValue(new Promise<void>(() => undefined));

    await expect(service.handleWebhook({ update: mock<Update>({ update_id: 2 }), secret: SECRET })).resolves.toBeUndefined();
  });

  it('handles an update once when Telegram delivers it again', async () => {
    const { bot, service } = createBot();
    const repeated = mock<Update>({ update_id: 3 });

    await service.handleWebhook({ update: repeated, secret: SECRET });
    await service.handleWebhook({ update: repeated, secret: SECRET });

    await vi.waitFor(() => expect(bot.handleUpdate).toHaveBeenCalled());
    expect(bot.handleUpdate).toHaveBeenCalledOnce();
  });

  it('keeps acknowledging when the bot fails on an update', async () => {
    const { bot, service } = createBot();

    bot.handleUpdate.mockRejectedValue(new Error('telegram down'));

    await expect(service.handleWebhook({ update: mock<Update>({ update_id: 4 }), secret: SECRET })).resolves.toBeUndefined();
  });

  it('drops an update with a wrong or missing secret', async () => {
    const { bot, service } = createBot();

    await service.handleWebhook({ update, secret: `${SECRET}-forged` });
    await service.handleWebhook({ update, secret: undefined });

    expect(bot.handleUpdate).not.toHaveBeenCalled();
  });

  it('drops every update while no webhook secret is configured', async () => {
    const { bot, service } = createBot('');

    await service.handleWebhook({ update, secret: '' });

    expect(bot.handleUpdate).not.toHaveBeenCalled();
  });
});
