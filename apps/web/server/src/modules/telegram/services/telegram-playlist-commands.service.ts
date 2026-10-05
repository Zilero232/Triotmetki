import { Injectable } from '@nestjs/common';
import { PLAYLIST } from '@otmetki/schemas';

import type { BotContext, PlaylistReasonInput } from '../telegram.types';

import { roundTo } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PlaylistReaderService } from '../../analytics';
import { SITE_LINKS, siteUrl } from '../../bot-commands';
import { openButton } from '../lib/keyboard/keyboard';

@Injectable()
export class TelegramPlaylistCommandsService {
  constructor(
    private readonly config: AppConfigService,
    private readonly playlists: PlaylistReaderService
  ) {}

  async next(ctx: BotContext): Promise<void> {
    const userId = ctx.chat$?.userId;

    if (!userId) {
      await ctx.reply(ctx.t('next-not-linked'));

      return;
    }

    const playlist = await this.playlists.playlist({ userId });

    if (playlist.state === 'noLink') {
      await ctx.reply(ctx.t('next-not-linked'));

      return;
    }

    if (playlist.state === 'noGarage') {
      await ctx.reply(ctx.t('next-no-garage'));

      return;
    }

    if (playlist.items.length === 0) {
      await ctx.reply(ctx.t('next-empty'));

      return;
    }

    const lines = playlist.items.map((item) =>
      ctx.t('next-line', { tank: item.vehicle.shortName, reasons: item.reasons.map((reason) => this.reason({ ctx, item, reason })).join(', ') })
    );

    const footer = playlist.isExtended ? [] : [ctx.t('next-plus-hint', { size: PLAYLIST.plusSize })];

    await ctx.reply([ctx.t('next-header'), ...lines, ...footer].join('\n'), {
      reply_markup: openButton({ label: ctx.t('open-site'), url: siteUrl({ webUrl: this.config.get('WEB_URL'), path: SITE_LINKS.analytics }) })
    });
  }

  private reason({ ctx, item, reason }: PlaylistReasonInput): string {
    return ctx.t(`next-reason-${reason}`, { percent: roundTo({ value: item.moePercent ?? 0, digits: 1 }), days: item.daysSinceBattle ?? 0 });
  }
}
