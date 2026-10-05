import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { keys } from 'remeda';

import type { BotCommandSpec, BotContext, ConsumeInput, GuardInput, LinkPromptInput, TelegramIdentity } from '../telegram.types';

import { errorMessage } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { BotRepliesService, isPublicUrl, resolveBotLocale } from '../../bot-commands';
import { BOT, SHARED_COMMAND_OF } from '../config/bot.constants';
import { WEB_LOGIN } from '../config/web-login.constants';
import { linkConfirmData, looksLikeLinkCode, parseLinkConfirm } from '../lib/link-code/link-code';
import { TelegramIdentityWriterService } from './telegram-identity-writer.service';
import { TelegramLinkWriterService } from './telegram-link-writer.service';
import { TelegramMissionCommandsService } from './telegram-mission-commands.service';
import { TelegramPlaylistCommandsService } from './telegram-playlist-commands.service';
import { TelegramSharedCommandsService } from './telegram-shared-commands.service';

@Injectable()
export class TelegramCommandsService {
  private readonly logger = new Logger(TelegramCommandsService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly shared: TelegramSharedCommandsService,
    private readonly replies: BotRepliesService,
    private readonly missions: TelegramMissionCommandsService,
    private readonly playlists: TelegramPlaylistCommandsService,
    private readonly links: TelegramLinkWriterService,
    private readonly identity: TelegramIdentityWriterService
  ) {}

  get commands(): BotCommandSpec[] {
    return [
      ...keys(SHARED_COMMAND_OF).map((command) => ({ command, run: (ctx: BotContext) => this.shared.run({ ctx, command }) })),
      { command: 'lbz', run: (ctx) => this.missions.lbz(ctx) },
      { command: 'next', run: (ctx) => this.playlists.next(ctx) },
      { command: 'login', run: (ctx) => this.login(ctx) },
      { command: 'help', run: (ctx) => this.help(ctx) }
    ];
  }

  identityOf(ctx: BotContext): TelegramIdentity | null {
    const from = ctx.from;

    if (!from || from.is_bot) {
      return null;
    }

    return {
      telegramId: BigInt(from.id),
      username: from.username ?? null,
      name: from.username ?? from.first_name,
      languageCode: from.language_code ?? null
    };
  }

  async guard({ ctx, run }: GuardInput): Promise<void> {
    try {
      await run();
    } catch (error) {
      const isNotFound = error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND;

      if (!isNotFound) {
        this.logger.warn(`telegram command failed: ${errorMessage(error)}`);
      }

      await ctx.reply(this.replies.failure({ locale: resolveBotLocale(await ctx.i18n.getLocale()), error }).text);
    }
  }

  async start(ctx: BotContext): Promise<void> {
    const payload = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    const identity = this.identityOf(ctx);

    if (!identity) {
      return;
    }

    if (looksLikeLinkCode(payload)) {
      await this.askLink({ ctx, code: payload });

      return;
    }

    const keyboard = new InlineKeyboard();
    const webUrl = this.config.get('WEB_URL');

    if (isPublicUrl(webUrl) && this.isPrivate(ctx)) {
      const userId = await this.identity.ensureUser(identity);

      keyboard
        .url(ctx.t('login-button'), await this.links.issueWebLogin(userId))
        .row()
        .webApp(ctx.t('open-app'), webUrl);
    }

    await ctx.reply(ctx.t('start-welcome'), { reply_markup: keyboard });
  }

  async askLink({ ctx, code }: LinkPromptInput): Promise<void> {
    if (!this.isPrivate(ctx)) {
      await ctx.reply(ctx.t('private-only'));

      return;
    }

    const preview = await this.links.previewCode(code);

    if (!preview) {
      await ctx.reply(ctx.t('start-code-invalid'));

      return;
    }

    const keyboard = new InlineKeyboard()
      .text(ctx.t('link-confirm-yes'), linkConfirmData({ answer: 'yes', code: preview.code }))
      .text(ctx.t('link-confirm-no'), linkConfirmData({ answer: 'no' }));

    await ctx.reply(ctx.t('link-confirm', { name: preview.accountName }), { reply_markup: keyboard });
  }

  async confirmLink(ctx: BotContext): Promise<void> {
    const answer = parseLinkConfirm(ctx.callbackQuery?.data ?? '');
    const identity = this.identityOf(ctx);

    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => undefined);

    if (!answer || !identity || !this.isPrivate(ctx)) {
      return;
    }

    if (answer.answer === 'no') {
      await ctx.reply(ctx.t('link-cancelled'));

      return;
    }

    await this.consume({ ctx, identity, code: answer.code });
  }

  async consume({ ctx, identity, code }: ConsumeInput): Promise<void> {
    try {
      await this.links.consumeCode({ code, identity });
      await ctx.reply(ctx.t('start-linked'));
    } catch (error) {
      const isConflict = error instanceof HttpException && error.getStatus() === HttpStatus.CONFLICT;

      await ctx.reply(ctx.t(isConflict ? 'start-code-taken' : 'start-code-invalid'));
    }
  }

  private async login(ctx: BotContext): Promise<void> {
    const identity = this.identityOf(ctx);

    if (!identity) {
      return;
    }

    if (!this.isPrivate(ctx)) {
      await ctx.reply(ctx.t('private-only'));

      return;
    }

    const userId = ctx.chat$?.userId ?? (await this.identity.ensureUser(identity));
    const url = await this.links.issueWebLogin(userId);

    await ctx.reply(`${ctx.t('login-link', { minutes: WEB_LOGIN.ttlMinutes })}\n${url}`, {
      link_preview_options: { is_disabled: true },
      reply_markup: isPublicUrl(url) ? new InlineKeyboard().url(ctx.t('login-button'), url) : undefined
    });
  }

  private isPrivate(ctx: BotContext): boolean {
    return ctx.chat?.type === 'private';
  }

  private async help(ctx: BotContext): Promise<void> {
    await ctx.reply(ctx.t('help', { bot: this.config.get('TELEGRAM_BOT_USERNAME') || BOT.fallbackUsername }));
  }
}
