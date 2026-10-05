import { Injectable } from '@nestjs/common';
import { InlineQueryResultBuilder } from 'grammy';

import type { BotContext } from '../telegram.types';

import { AppConfigService } from '../../../config';
import { BotRepliesService, BotStatsReaderService, isPublicUrl, resolveBotLocale, statCardUrl } from '../../bot-commands';
import { BOT_TEXT_LIMITS } from '../config/bot.constants';

@Injectable()
export class TelegramInlineService {
  constructor(
    private readonly config: AppConfigService,
    private readonly stats: BotStatsReaderService,
    private readonly replies: BotRepliesService
  ) {}

  async answer(ctx: BotContext): Promise<void> {
    const query = ctx.inlineQuery?.query.trim() ?? '';
    const options = { cache_time: BOT_TEXT_LIMITS.inlineCacheSeconds };

    if (query.length < BOT_TEXT_LIMITS.queryMinLength) {
      await ctx.answerInlineQuery([], options);

      return;
    }

    const accountId = await this.stats.resolve(query).catch(() => null);

    if (!accountId) {
      await ctx.answerInlineQuery([], options);

      return;
    }

    const card = await this.stats.player(accountId);
    const locale = resolveBotLocale(await ctx.i18n.getLocale());
    const image = statCardUrl({ webUrl: this.config.get('WEB_URL'), accountId });

    const result = InlineQueryResultBuilder.article(`player-${accountId}`, card.nickname, {
      description: this.replies.playerBrief({ locale, card }),
      ...(isPublicUrl(image) ? { thumbnail_url: image } : {})
    }).text(this.replies.playerText({ locale, card }), { link_preview_options: { url: image, prefer_large_media: true } });

    await ctx.answerInlineQuery([result], options);
  }
}
