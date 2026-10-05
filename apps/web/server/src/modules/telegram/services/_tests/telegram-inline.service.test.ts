import type { InlineQuery } from 'grammy/types';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { BotRepliesService, BotStatsReaderService } from '../../../bot-commands';
import type { BotContext } from '../../telegram.types';

import { BOT_TEXT_LIMITS } from '../../config/bot.constants';
import { TelegramInlineService } from '../telegram-inline.service';

const CARD = { accountId: 7n, nickname: 'Tanker', battles: 100, winRate: 52, avgDamage: 1800, wn8: 1500, clanTag: null };

const createService = () => {
  const config = mock<AppConfigService>();
  const stats = mock<BotStatsReaderService>();
  const replies = mock<BotRepliesService>();

  config.get.mockReturnValue('https://triotmetki.ru');
  stats.resolve.mockResolvedValue(7n);
  stats.player.mockResolvedValue(CARD);
  replies.playerBrief.mockReturnValue('brief');
  replies.playerText.mockReturnValue('text');

  return { service: new TelegramInlineService(config, stats, replies), stats };
};

const contextOf = (query: string) => {
  const ctx = mockDeep<BotContext>();

  Object.assign(ctx, { inlineQuery: mock<InlineQuery>({ query }) });
  ctx.i18n.getLocale.mockResolvedValue('ru');

  return ctx;
};

describe('TelegramInlineService.answer', () => {
  it('answers an empty list for a query shorter than the minimum', async () => {
    const { service, stats } = createService();
    const ctx = contextOf('a'.repeat(BOT_TEXT_LIMITS.queryMinLength - 1));

    await service.answer(ctx);

    expect(stats.resolve).not.toHaveBeenCalled();
    expect(ctx.answerInlineQuery).toHaveBeenCalledWith([], { cache_time: BOT_TEXT_LIMITS.inlineCacheSeconds });
  });

  it('answers an empty list when the player cannot be found', async () => {
    const { service, stats } = createService();
    const ctx = contextOf('Nobody');

    stats.resolve.mockRejectedValue(new Error('not found'));
    await service.answer(ctx);

    expect(stats.player).not.toHaveBeenCalled();
    expect(ctx.answerInlineQuery.mock.calls[0]?.[0]).toEqual([]);
  });

  it('answers one player article with the stat card as thumbnail', async () => {
    const { service } = createService();
    const ctx = contextOf('  Tanker  ');

    await service.answer(ctx);

    const [results] = ctx.answerInlineQuery.mock.calls[0] ?? [];

    expect(results).toHaveLength(1);
    expect(results?.[0]).toMatchObject({ type: 'article', id: 'player-7', title: 'Tanker', description: 'brief' });
    expect(results?.[0]).toHaveProperty('thumbnail_url', expect.stringContaining('7'));
  });
});
