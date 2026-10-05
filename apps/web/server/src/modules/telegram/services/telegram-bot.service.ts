import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import type { Update } from 'grammy/types';

import { I18n } from '@grammyjs/i18n';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Bot } from 'grammy';
import { Redis } from 'ioredis';
import pRetry from 'p-retry';

import type { BotContext, TelegramWebhookInput } from '../telegram.types';

import { errorMessage, timingSafeEqual } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { REDIS } from '../../../core';
import { BOT, BOT_API, BOT_COMMANDS, EXTERNAL_BOT_COMMANDS, TELEGRAM_TOKENS, WEBHOOK } from '../config';
import { LINK_CONFIRM_DATA, looksLikeLinkCode, webhookUrl } from '../lib';
import { TelegramChatService } from './telegram-chat.service';
import { TelegramCommandRegistry } from './telegram-command-registry.service';
import { TelegramCommandsService } from './telegram-commands.service';
import { TelegramInlineService } from './telegram-inline.service';
import { TelegramSettingsService } from './telegram-settings.service';

@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private ready: Promise<void> = Promise.resolve();
  private isPolling = false;

  constructor(
    @Inject(TELEGRAM_TOKENS.bot) private readonly bot: Bot<BotContext> | null,
    @Inject(TELEGRAM_TOKENS.i18n) private readonly i18n: I18n<BotContext>,
    private readonly config: AppConfigService,
    private readonly chats: TelegramChatService,
    private readonly commands: TelegramCommandsService,
    private readonly inline: TelegramInlineService,
    private readonly settings: TelegramSettingsService,
    private readonly registry: TelegramCommandRegistry,
    @Inject(REDIS) private readonly redis: Redis
  ) {
    if (this.bot) {
      this.register(this.bot);
    }
  }

  get isEnabled(): boolean {
    return this.bot !== null;
  }

  onApplicationBootstrap(): void {
    if (!this.bot) {
      this.logger.log('telegram bot is disabled: TELEGRAM_BOT_TOKEN is empty');

      return;
    }

    if (this.config.get('NODE_ENV') === 'test') {
      return;
    }

    this.ready = this.launch(this.bot);

    this.ready.catch((error: unknown) => {
      this.logger.error(`telegram bot could not start: ${errorMessage(error)}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.isPolling) {
      await this.bot.stop();
    }
  }

  async handleWebhook({ update, secret }: TelegramWebhookInput): Promise<void> {
    const expected = this.config.get('TELEGRAM_WEBHOOK_SECRET');

    if (!expected || !secret || !timingSafeEqual({ left: secret, right: expected })) {
      return;
    }

    if (!(await this.claimUpdate(update.update_id))) {
      return;
    }

    void this.handleUpdate(update).catch((error: unknown) => {
      this.logger.error(`telegram update ${update.update_id} failed: ${errorMessage(error)}`);
    });
  }

  private async claimUpdate(updateId: number): Promise<boolean> {
    const claimed = await this.redis
      .set(`${WEBHOOK.seenPrefix}${updateId}`, WEBHOOK.seenMarker, 'EX', WEBHOOK.seenTtlSeconds, 'NX')
      .catch((error: unknown) => {
        this.logger.warn(`telegram update ${updateId} not deduplicated: ${errorMessage(error)}`);

        return 'OK';
      });

    return claimed !== null;
  }

  private async handleUpdate(update: Update): Promise<void> {
    if (!this.bot) {
      return;
    }

    await this.ready;
    await this.bot.handleUpdate(update);
  }

  private register(bot: Bot<BotContext>): void {
    bot.use(async (ctx, next) => {
      ctx.chat$ = ctx.from ? await this.chats.find(BigInt(ctx.from.id)) : null;

      await next();
    });

    bot.use(this.i18n);
    bot.use(this.settings.menu);

    bot.command('start', (ctx) => this.commands.guard({ ctx, run: () => this.commands.start(ctx) }));
    bot.command('settings', (ctx) => this.commands.guard({ ctx, run: () => this.settings.show(ctx) }));

    for (const { command, run } of this.commands.commands) {
      bot.command(command, (ctx) => this.commands.guard({ ctx, run: () => run(ctx) }));
    }

    for (const command of EXTERNAL_BOT_COMMANDS) {
      bot.command(command, (ctx) => this.commands.guard({ ctx, run: () => this.registry.run({ command, ctx }) }));
    }

    bot.callbackQuery(LINK_CONFIRM_DATA, (ctx) => this.commands.guard({ ctx, run: () => this.commands.confirmLink(ctx) }));
    bot.on('inline_query', (ctx) => this.commands.guard({ ctx, run: () => this.inline.answer(ctx) }));
    bot.on('message:text', (ctx) => this.commands.guard({ ctx, run: () => this.onText(ctx) }));

    bot.catch(({ error }) => {
      this.logger.error(`telegram update failed: ${errorMessage(error)}`);
    });
  }

  private async onText(ctx: BotContext): Promise<void> {
    const text = ctx.message?.text ?? '';
    const identity = this.commands.identityOf(ctx);

    if (identity && looksLikeLinkCode(text)) {
      await this.commands.askLink({ ctx, code: text });

      return;
    }

    await ctx.reply(ctx.t('help', { bot: this.bot?.botInfo.username ?? '' }));
  }

  private async launch(bot: Bot<BotContext>): Promise<void> {
    await pRetry(() => bot.init(), {
      retries: BOT_API.initAttempts,
      minTimeout: BOT_API.initBackoffMs,
      onFailedAttempt: ({ attemptNumber }) => {
        this.logger.warn(`telegram init attempt ${attemptNumber} failed`);
      }
    });

    await this.describe(bot).catch((error: unknown) => {
      this.logger.warn(`telegram commands not updated: ${errorMessage(error)}`);
    });

    const base = this.config.get('TELEGRAM_WEBHOOK_URL');
    const secret = this.config.get('TELEGRAM_WEBHOOK_SECRET');

    if (base && secret) {
      await bot.api.setWebhook(webhookUrl(base), { secret_token: secret });
      this.logger.log(`telegram webhook set to ${webhookUrl(base)}`);

      return;
    }

    await bot.api.deleteWebhook();
    this.isPolling = true;

    void bot.start({ onStart: ({ username }) => this.logger.log(`telegram bot @${username} is polling`) }).catch((error: unknown) => {
      this.isPolling = false;
      this.logger.error(`telegram polling stopped: ${errorMessage(error)}`);
    });
  }

  private async describe(bot: Bot<BotContext>): Promise<void> {
    const commandsFor = (locale: string) => BOT_COMMANDS.map((command) => ({ command, description: this.i18n.t(locale, `cmd-${command}`) }));

    await bot.api.setMyCommands(commandsFor(BOT.fallbackLocale));

    for (const locale of BOT.locales) {
      await bot.api.setMyCommands(commandsFor(locale), { language_code: locale });
    }
  }
}
