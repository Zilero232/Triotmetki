import { Injectable } from '@nestjs/common';

import type { SharedCommandInput } from '../telegram.types';

import { BotRepliesService, resolveBotLocale } from '../../bot-commands';
import { SHARED_COMMAND_OF } from '../config/bot.constants';
import { replyOptions } from '../lib/bot-reply/bot-reply';

@Injectable()
export class TelegramSharedCommandsService {
  constructor(private readonly replies: BotRepliesService) {}

  async run({ ctx, command }: SharedCommandInput): Promise<void> {
    const reply = await this.replies.reply({
      command: SHARED_COMMAND_OF[command],
      locale: resolveBotLocale(await ctx.i18n.getLocale()),
      accountId: ctx.chat$?.accountId ?? null,
      argument: typeof ctx.match === 'string' ? ctx.match.trim() : ''
    });

    await ctx.reply(reply.text, replyOptions(reply));
  }
}
