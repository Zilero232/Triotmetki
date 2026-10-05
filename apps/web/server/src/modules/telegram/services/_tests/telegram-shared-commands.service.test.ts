import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { BotRepliesService } from '../../../bot-commands';
import type { BotContext, LinkedChat } from '../../telegram.types';

import { SHARED_COMMAND_OF } from '../../config/bot.constants';
import { TelegramSharedCommandsService } from '../telegram-shared-commands.service';

const CHAT: LinkedChat = { userId: 'user', telegramId: 42n, accountId: 7n, nickname: 'Tanker', locale: 'en' };

const createService = () => {
  const replies = mock<BotRepliesService>();

  replies.reply.mockResolvedValue({ text: 'card', link: null, imageUrl: null });

  return { service: new TelegramSharedCommandsService(replies), replies };
};

const contextOf = ({ chat, match }: { chat: LinkedChat | null; match: string }) => {
  const ctx = mockDeep<BotContext>();

  ctx.chat$ = chat;
  ctx.match = match;
  ctx.i18n.getLocale.mockResolvedValue('en-US');

  return ctx;
};

describe('TelegramSharedCommandsService.run', () => {
  it('maps the Telegram command to the shared reply with the linked account and trimmed argument', async () => {
    const { service, replies } = createService();
    const ctx = contextOf({ chat: CHAT, match: '  Tanker ' });

    await service.run({ ctx, command: 'me' });

    expect(replies.reply).toHaveBeenCalledWith({ command: SHARED_COMMAND_OF.me, locale: 'en', accountId: 7n, argument: 'Tanker' });
    expect(ctx.reply).toHaveBeenCalledWith('card', {});
  });

  it('passes no account for an unlinked chat', async () => {
    const { service, replies } = createService();

    await service.run({ ctx: contextOf({ chat: null, match: '' }), command: 'top' });

    expect(replies.reply).toHaveBeenCalledWith(expect.objectContaining({ accountId: null, argument: '' }));
  });
});
