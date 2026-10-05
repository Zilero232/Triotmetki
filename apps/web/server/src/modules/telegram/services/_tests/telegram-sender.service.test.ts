import type { Bot } from 'grammy';

import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { BotContext } from '../../telegram.types';

import { createBotI18n } from '../../providers/telegram-i18n.provider';
import { TelegramSenderService } from '../telegram-sender.service';

const message = { telegramId: 42n, locale: 'ru' as const, title: 'Новая отметка!', body: 'Tanker: 3-я отметка' };

describe('TelegramSenderService', () => {
  it('does nothing when the bot is disabled', async () => {
    const sender = new TelegramSenderService(null, createBotI18n());

    expect(sender.isEnabled).toBe(false);
    await expect(sender.sendNotification({ ...message, url: 'https://triotmetki.ru' })).resolves.toBeUndefined();
  });

  it('bolds the title with an entity instead of markup and adds an open button for a public link', async () => {
    const bot = mockDeep<Bot<BotContext>>();
    const sender = new TelegramSenderService(bot, createBotI18n());

    const url = 'https://triotmetki.ru/p/Tanker';

    await sender.sendNotification({ ...message, url });

    const [chatId, text, options] = bot.api.sendMessage.mock.calls[0] ?? [];

    expect(chatId).toBe(42);
    expect(text).toBe(`${message.title}\n${message.body}`);
    expect(options?.entities).toEqual([{ type: 'bold', offset: 0, length: message.title.length }]);
    expect(options?.reply_markup).toMatchObject({ inline_keyboard: [[{ text: 'Открыть', url }]] });
  });

  it('sends no button when the notification has no link', async () => {
    const bot = mockDeep<Bot<BotContext>>();
    const sender = new TelegramSenderService(bot, createBotI18n());

    await sender.sendNotification({ ...message, url: null });

    expect(bot.api.sendMessage.mock.calls[0]?.[2]?.reply_markup).toBeUndefined();
  });

  it('leaves out the button for a local link Telegram would reject', async () => {
    const bot = mockDeep<Bot<BotContext>>();
    const sender = new TelegramSenderService(bot, createBotI18n());

    await sender.sendNotification({ ...message, url: 'http://localhost:3000/p/Tanker' });

    expect(bot.api.sendMessage.mock.calls[0]?.[2]?.reply_markup).toBeUndefined();
  });
});
