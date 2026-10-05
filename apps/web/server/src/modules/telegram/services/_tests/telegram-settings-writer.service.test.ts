import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { NotificationSettings } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { BotContext, LinkedChat } from '../../telegram.types';

import { SETTINGS_MENU } from '../../config/settings-menu.constants';
import { TelegramSettingsWriterService } from '../telegram-settings-writer.service';

const stored = (overrides: Partial<NotificationSettings>): NotificationSettings =>
  mock<NotificationSettings>({ channels: ['site'], events: ['moeGained'], weeklyDigest: false, ...overrides });

const createService = (row: NotificationSettings | null = null) => {
  const prisma = mockDeep<PrismaService>();

  prisma.notificationSettings.findUnique.mockResolvedValue(row);

  return { service: new TelegramSettingsWriterService(prisma), prisma };
};

const contextOf = (chat: LinkedChat | null) => {
  const ctx = mockDeep<BotContext>();

  ctx.chat$ = chat;
  ctx.t.mockImplementation((key) => key);

  return ctx;
};

const CHAT: LinkedChat = { userId: 'user', telegramId: 42n, accountId: null, nickname: null, locale: 'ru' };

describe('TelegramSettingsWriterService.load', () => {
  it('returns the defaults for a user who never saved settings', async () => {
    const { service } = createService();

    await expect(service.load('user')).resolves.toEqual({
      channels: [...SETTINGS_MENU.defaultChannels],
      events: [...SETTINGS_MENU.defaultEvents],
      weeklyDigest: false
    });
  });
});

describe('TelegramSettingsWriterService.toggleChannel', () => {
  it('adds a channel that was off', async () => {
    const { service, prisma } = createService(stored({ channels: ['site'] }));

    await service.toggleChannel({ userId: 'user', channel: 'telegram' });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].update).toEqual({ channels: ['site', 'telegram'] });
  });

  it('removes a channel that was on', async () => {
    const { service, prisma } = createService(stored({ channels: ['site', 'telegram'] }));

    await service.toggleChannel({ userId: 'user', channel: 'telegram' });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].update).toEqual({ channels: ['site'] });
  });

  it('creates the settings row from the defaults on the first toggle', async () => {
    const { service, prisma } = createService();

    await service.toggleChannel({ userId: 'user', channel: 'telegram' });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].create).toMatchObject({
      userId: 'user',
      events: [...SETTINGS_MENU.defaultEvents],
      channels: [...SETTINGS_MENU.defaultChannels, 'telegram']
    });
  });
});

describe('TelegramSettingsWriterService.toggleEvent', () => {
  it('turns an enabled event off', async () => {
    const { service, prisma } = createService(stored({ events: ['moeGained', 'bonusCode'] }));

    await service.toggleEvent({ userId: 'user', event: 'moeGained' });

    expect(prisma.notificationSettings.upsert.mock.calls[0]?.[0].update).toEqual({ events: ['bonusCode'] });
  });
});

describe('TelegramSettingsWriterService.show', () => {
  it('asks an unlinked chat to link first instead of showing the menu', async () => {
    const { service } = createService();
    const ctx = contextOf(null);

    await service.show(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('settings-not-linked');
  });

  it('shows the settings menu to a linked chat', async () => {
    const { service } = createService();
    const ctx = contextOf(CHAT);

    await service.show(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('settings-title', { reply_markup: service.menu });
  });
});
