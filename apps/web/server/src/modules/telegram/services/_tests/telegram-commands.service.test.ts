import type { User } from 'grammy/types';

import { keys } from 'remeda';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { BotRepliesService } from '../../../bot-commands';
import type { BotContext, LinkedChat } from '../../telegram.types';
import type { TelegramIdentityWriterService } from '../telegram-identity-writer.service';
import type { TelegramLinkWriterService } from '../telegram-link-writer.service';
import type { TelegramMissionCommandsService } from '../telegram-mission-commands.service';
import type { TelegramPlaylistCommandsService } from '../telegram-playlist-commands.service';
import type { TelegramSharedCommandsService } from '../telegram-shared-commands.service';

import { AppConflictException, AppNotFoundException } from '../../../../common/exceptions';
import { BOT, SHARED_COMMAND_OF } from '../../config/bot.constants';
import { LINK_CODE } from '../../config/link-code.constants';
import { linkConfirmData } from '../../lib/link-code/link-code';
import { TelegramCommandsService } from '../telegram-commands.service';

const USER: User = { id: 42, is_bot: false, first_name: 'Tank', username: 'tanker', language_code: 'ru' };
const CODE = LINK_CODE.alphabet.slice(0, LINK_CODE.length);
const CHAT: LinkedChat = { userId: 'linked-user', telegramId: 42n, accountId: 7n, nickname: 'Tanker', locale: 'ru' };

const createService = (webUrl = 'https://triotmetki.ru') => {
  const config = mock<AppConfigService>();
  const replies = mock<BotRepliesService>();
  const links = mock<TelegramLinkWriterService>();
  const identity = mock<TelegramIdentityWriterService>();

  config.get.mockReturnValue(webUrl);
  identity.ensureUser.mockResolvedValue('user');
  links.issueWebLogin.mockResolvedValue('https://triotmetki.ru/login/telegram?code=abc');
  replies.failure.mockReturnValue({ text: 'failure', link: null, imageUrl: null });

  const service = new TelegramCommandsService(
    config,
    mock<TelegramSharedCommandsService>(),
    replies,
    mock<TelegramMissionCommandsService>(),
    mock<TelegramPlaylistCommandsService>(),
    links,
    identity
  );

  return { service, config, replies, links, identity };
};

type ContextInput = { from?: User | undefined; match?: string; chat?: LinkedChat | null; chatType?: 'group' | 'private' };

const contextOf = (input: ContextInput = {}) => {
  const { match = '', chat = null, chatType = 'private' } = input;
  const ctx = mockDeep<BotContext>();

  Object.assign(ctx, { from: 'from' in input ? input.from : USER, chat: { id: chatType === 'private' ? 42 : -100, type: chatType } });
  ctx.match = match;
  ctx.chat$ = chat;
  ctx.t.mockImplementation((key) => key);
  ctx.i18n.getLocale.mockResolvedValue('ru');

  return ctx;
};

describe('TelegramCommandsService.commands', () => {
  it('registers every shared command next to the Telegram-only ones', () => {
    const { service } = createService();
    const names = service.commands.map((spec) => spec.command);

    expect(names).toEqual(expect.arrayContaining([...keys(SHARED_COMMAND_OF), 'lbz', 'next', 'login', 'help']));
  });
});

describe('TelegramCommandsService.identityOf', () => {
  it('ignores bots and updates without a sender', () => {
    const { service } = createService();

    expect(service.identityOf(contextOf({ from: { ...USER, is_bot: true } }))).toBeNull();
    expect(service.identityOf(contextOf({ from: undefined }))).toBeNull();
  });

  it('names a user without a username after the first name', () => {
    const { service } = createService();

    expect(service.identityOf(contextOf({ from: { id: 1, is_bot: false, first_name: 'Tank' } }))).toEqual({
      telegramId: 1n,
      username: null,
      name: 'Tank',
      languageCode: null
    });
  });
});

describe('TelegramCommandsService.start', () => {
  it('asks to confirm the target account before linking with a code', async () => {
    const { service, links } = createService();
    const ctx = contextOf({ match: ` ${CODE.toLowerCase()} ` });

    links.previewCode.mockResolvedValue({ code: CODE, accountName: 'Owner' });
    await service.start(ctx);

    expect(links.previewCode).toHaveBeenCalledWith(CODE.toLowerCase());
    expect(links.consumeCode).not.toHaveBeenCalled();
    expect(ctx.t).toHaveBeenCalledWith('link-confirm', { name: 'Owner' });

    const buttons = ctx.reply.mock.calls[0]?.[1]?.reply_markup;
    const data =
      buttons && 'inline_keyboard' in buttons
        ? buttons.inline_keyboard.flat().map((button) => ('callback_data' in button ? button.callback_data : null))
        : [];

    expect(data).toEqual([linkConfirmData({ answer: 'yes', code: CODE }), linkConfirmData({ answer: 'no' })]);
  });

  it('refuses a link code sent in a group, so another member cannot confirm it', async () => {
    const { service, links } = createService();
    const ctx = contextOf({ match: CODE, chatType: 'group' });

    await service.start(ctx);

    expect(links.previewCode).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('private-only');
  });

  it('offers no sign-in button in a group', async () => {
    const { service, links } = createService();

    await service.start(contextOf({ chatType: 'group' }));

    expect(links.issueWebLogin).not.toHaveBeenCalled();
  });

  it('reports an unknown code without asking for confirmation', async () => {
    const { service, links } = createService();
    const ctx = contextOf({ match: CODE });

    links.previewCode.mockResolvedValue(null);
    await service.start(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('start-code-invalid');
    expect(links.consumeCode).not.toHaveBeenCalled();
  });

  it('offers login and the mini app on a public site', async () => {
    const { service, identity } = createService();
    const ctx = contextOf();

    await service.start(ctx);

    expect(identity.ensureUser).toHaveBeenCalled();
    expect(ctx.reply.mock.calls[0]?.[1]?.reply_markup).toMatchObject({ inline_keyboard: [[expect.anything()], [expect.anything()]] });
  });

  it('creates no user and shows no buttons for a local site', async () => {
    const { service, identity } = createService('http://localhost:3000');
    const ctx = contextOf();

    await service.start(ctx);

    expect(identity.ensureUser).not.toHaveBeenCalled();
    const markup = ctx.reply.mock.calls[0]?.[1]?.reply_markup;

    expect(markup && 'inline_keyboard' in markup ? markup.inline_keyboard.flat() : null).toEqual([]);
  });

  it('ignores a start from a bot', async () => {
    const { service } = createService();
    const ctx = contextOf({ from: { ...USER, is_bot: true } });

    await service.start(ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
  });
});

describe('TelegramCommandsService.confirmLink', () => {
  const confirmContext = (data: string) => {
    const ctx = contextOf();

    Object.assign(ctx, { callbackQuery: { id: 'q', from: USER, chat_instance: 'c', data } });
    ctx.editMessageReplyMarkup.mockResolvedValue(true);

    return ctx;
  };

  it('links the account only after the user confirms', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'yes', code: CODE }));

    await service.confirmLink(ctx);

    expect(links.consumeCode).toHaveBeenCalledWith(expect.objectContaining({ code: CODE, identity: expect.objectContaining({ telegramId: 42n }) }));
    expect(ctx.reply).toHaveBeenCalledWith('start-linked');
  });

  it('links nothing when the confirmation is pressed in a group', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'yes', code: CODE }));

    Object.assign(ctx, { chat: { id: -100, type: 'group' } });
    await service.confirmLink(ctx);

    expect(links.consumeCode).not.toHaveBeenCalled();
  });

  it('links nothing when the user declines', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'no' }));

    await service.confirmLink(ctx);

    expect(links.consumeCode).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('link-cancelled');
  });

  it('ignores a confirmation that does not carry a valid code', async () => {
    const { service, links } = createService();
    const ctx = confirmContext('tglink:yes:!!');

    await service.confirmLink(ctx);

    expect(links.consumeCode).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledOnce();
  });

  it('ignores a confirmation pressed by a bot', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'yes', code: CODE }));

    Object.assign(ctx, { from: { ...USER, is_bot: true } });
    await service.confirmLink(ctx);

    expect(links.consumeCode).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('ignores a callback without data', async () => {
    const { service, links } = createService();
    const ctx = contextOf();

    Object.assign(ctx, { callbackQuery: undefined });
    ctx.editMessageReplyMarkup.mockResolvedValue(true);
    await service.confirmLink(ctx);

    expect(links.consumeCode).not.toHaveBeenCalled();
  });

  it('still links when the confirmation keyboard can no longer be removed', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'yes', code: CODE }));

    ctx.editMessageReplyMarkup.mockRejectedValue(new Error('message is not modified'));
    await service.confirmLink(ctx);

    expect(links.consumeCode).toHaveBeenCalledOnce();
    expect(ctx.reply).toHaveBeenCalledWith('start-linked');
  });

  it('explains that a code is taken by another account', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'yes', code: CODE }));

    links.consumeCode.mockRejectedValue(new AppConflictException('CONFLICT', 'taken'));
    await service.confirmLink(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('start-code-taken');
  });

  it('reports any other failure as an invalid code', async () => {
    const { service, links } = createService();
    const ctx = confirmContext(linkConfirmData({ answer: 'yes', code: CODE }));

    links.consumeCode.mockRejectedValue(new Error('expired'));
    await service.confirmLink(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('start-code-invalid');
  });
});

describe('TelegramCommandsService.guard', () => {
  it('replies with a localized failure when a command throws', async () => {
    const { service, replies } = createService();
    const ctx = contextOf();
    const error = new AppNotFoundException('PLAYER_NOT_FOUND', 'missing');

    await service.guard({ ctx, run: () => Promise.reject(error) });

    expect(replies.failure).toHaveBeenCalledWith({ locale: 'ru', error });
    expect(ctx.reply).toHaveBeenCalledWith('failure');
  });

  it('stays quiet when the command succeeds', async () => {
    const { service } = createService();
    const ctx = contextOf();

    await service.guard({ ctx, run: () => Promise.resolve() });

    expect(ctx.reply).not.toHaveBeenCalled();
  });
});

describe('TelegramCommandsService login and help', () => {
  const run = (service: TelegramCommandsService, command: string, ctx: BotContext) =>
    service.commands.find((spec) => spec.command === command)?.run(ctx);

  it('issues the web login for the linked user without creating one', async () => {
    const { service, identity, links } = createService();
    const ctx = contextOf({ chat: CHAT });

    await run(service, 'login', ctx);

    expect(identity.ensureUser).not.toHaveBeenCalled();
    expect(links.issueWebLogin).toHaveBeenCalledWith(CHAT.userId);
  });

  it('never posts a sign-in link into a group, where every member could use it', async () => {
    const { service, links } = createService();
    const ctx = contextOf({ chat: CHAT, chatType: 'group' });

    await run(service, 'login', ctx);

    expect(links.issueWebLogin).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('private-only');
  });

  it('creates a user for an unlinked chat before issuing the login', async () => {
    const { service, links } = createService();

    await run(service, 'login', contextOf());

    expect(links.issueWebLogin).toHaveBeenCalledWith('user');
  });

  it('names the fallback bot username in help when none is configured', async () => {
    const { service, config } = createService();
    const ctx = contextOf();

    config.get.mockReturnValue('');
    await run(service, 'help', ctx);

    expect(ctx.t).toHaveBeenCalledWith('help', { bot: BOT.fallbackUsername });
  });
});
