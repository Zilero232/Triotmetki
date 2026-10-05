import type { OnModuleInit } from '@nestjs/common';
import type { InlineKeyboard } from 'grammy';

import { Injectable } from '@nestjs/common';
import { WATCHLIST } from '@otmetki/schemas';

import type { BotContext } from '../../telegram';
import type { WatchCommandAddInput } from '../watchlist.types';

import { AppForbiddenException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { BotStatsReaderService, siteUrl } from '../../bot-commands';
import { openButton, TelegramCommandRegistry } from '../../telegram';
import { WATCH_COMMAND } from '../config/watch-command.constants';
import { WatchlistWriterService } from './watchlist-writer.service';

@Injectable()
export class WatchlistBotService implements OnModuleInit {
  constructor(
    private readonly config: AppConfigService,
    private readonly stats: BotStatsReaderService,
    private readonly watchlist: WatchlistWriterService,
    private readonly registry: TelegramCommandRegistry
  ) {}

  onModuleInit(): void {
    this.registry.register({ command: WATCH_COMMAND.command, run: (ctx) => this.watch(ctx) });
  }

  async watch(ctx: BotContext): Promise<void> {
    const userId = ctx.chat$?.userId;

    if (!userId) {
      await ctx.reply(ctx.t('watch-not-linked'));

      return;
    }

    const nickname = typeof ctx.match === 'string' ? ctx.match.trim() : '';

    if (nickname) {
      await this.add({ ctx, userId, nickname });

      return;
    }

    const { players, limit } = await this.watchlist.list({ userId, query: { period: WATCHLIST.defaultPeriod } });

    if (players.length === 0) {
      await ctx.reply(ctx.t('watch-empty'));

      return;
    }

    const lines = players
      .slice(0, WATCH_COMMAND.maxLines)
      .map((player) =>
        ctx.t('watch-line', { nickname: player.nickname ?? String(player.accountId), battles: player.battles, marks: player.marksGained })
      );

    await ctx.reply([ctx.t('watch-header', { count: players.length, limit }), ...lines].join('\n'), { reply_markup: this.button(ctx) });
  }

  private async add({ ctx, userId, nickname }: WatchCommandAddInput): Promise<void> {
    const accountId = Number(await this.stats.resolve(nickname));

    try {
      const { players, limit } = await this.watchlist.add({ userId, accountId });
      const name = players.find((player) => player.accountId === accountId)?.nickname ?? nickname;

      await ctx.reply(ctx.t('watch-added', { nickname: name, count: players.length, limit }), { reply_markup: this.button(ctx) });
    } catch (error) {
      if (error instanceof AppForbiddenException) {
        await ctx.reply(ctx.t('watch-limit'), { reply_markup: this.button(ctx) });

        return;
      }

      throw error;
    }
  }

  private button(ctx: BotContext): InlineKeyboard | undefined {
    return openButton({ label: ctx.t('open-site'), url: siteUrl({ webUrl: this.config.get('WEB_URL'), path: WATCH_COMMAND.sitePath }) });
  }
}
