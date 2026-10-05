import { Injectable } from '@nestjs/common';

import type { BotContext } from '../telegram.types';

import { AppConfigService } from '../../../config';
import { SITE_LINKS, siteUrl } from '../../bot-commands';
import { MissionProgressReaderService } from '../../missions';
import { openButton } from '../lib/keyboard/keyboard';

@Injectable()
export class TelegramMissionCommandsService {
  constructor(
    private readonly config: AppConfigService,
    private readonly missions: MissionProgressReaderService
  ) {}

  async lbz(ctx: BotContext): Promise<void> {
    const userId = ctx.chat$?.userId;

    if (!userId) {
      await ctx.reply(ctx.t('lbz-not-linked'));

      return;
    }

    const next = await this.missions.next(userId);

    if (!next || next.missions.length === 0) {
      await ctx.reply(ctx.t('lbz-empty'));

      return;
    }

    const lines = next.missions.map((mission) =>
      ctx.t('lbz-line', { branch: ctx.t(`lbz-branch-${mission.branchKey}`), title: mission.title, condition: mission.condition ?? '' })
    );

    const path = SITE_LINKS.missions.replace('{campaign}', String(next.campaignId)).replace('{operation}', String(next.operationId));

    await ctx.reply([ctx.t('lbz-header', { operation: next.operationName }), ...lines].join('\n\n'), {
      reply_markup: openButton({ label: ctx.t('open-site'), url: siteUrl({ webUrl: this.config.get('WEB_URL'), path }) })
    });
  }
}
