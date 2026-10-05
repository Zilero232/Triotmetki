import type { Watchlist, WatchlistPlayer } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { BotStatsReaderService } from '../../../bot-commands';
import type { BotContext, TelegramCommandRegistry } from '../../../telegram';
import type { WatchlistWriterService } from '../watchlist-writer.service';

import { AppForbiddenException } from '../../../../common/exceptions';
import { WatchlistBotService } from '../watchlist-bot.service';

const CHAT: NonNullable<BotContext['chat$']> = { userId: 'user', telegramId: 42n, accountId: 7n, nickname: 'Tanker', locale: 'ru' };

const PLAYER: WatchlistPlayer = {
  followId: '00000000-0000-4000-8000-000000000001',
  accountId: 9,
  nickname: 'Rival',
  clanTag: null,
  watchedSince: '2026-09-20T10:00:00.000Z',
  lastBattleAt: null,
  battles: 12,
  wins: 7,
  winRate: 58.3,
  avgDamage: 2100,
  marksGained: 1,
  wn8: null
};

const watchlistOf = (players: WatchlistPlayer[]): Watchlist => ({ period: '24h', digest: 'daily', lastDigestAt: null, limit: 5, players });

const createService = () => {
  const config = mock<AppConfigService>();
  const stats = mock<BotStatsReaderService>();
  const watchlist = mock<WatchlistWriterService>();
  const registry = mock<TelegramCommandRegistry>();

  config.get.mockReturnValue('https://triotmetki.ru');
  stats.resolve.mockResolvedValue(9n);

  return { service: new WatchlistBotService(config, stats, watchlist, registry), stats, watchlist, registry };
};

const contextOf = ({ chat, match = '' }: { chat: BotContext['chat$']; match?: string }) => {
  const ctx = mockDeep<BotContext>();

  ctx.chat$ = chat;
  ctx.match = match;
  ctx.t.mockImplementation((key) => key);

  return ctx;
};

describe('WatchlistBotService.onModuleInit', () => {
  it('registers /watch with the bot', () => {
    const { service, registry } = createService();

    service.onModuleInit();

    expect(registry.register).toHaveBeenCalledWith({ command: 'watch', run: expect.any(Function) });
  });
});

describe('WatchlistBotService.watch', () => {
  it('asks an unlinked chat to link first', async () => {
    const { service, watchlist } = createService();
    const ctx = contextOf({ chat: null, match: 'Rival' });

    await service.watch(ctx);

    expect(watchlist.add).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('watch-not-linked');
  });

  it('lists the watched players without a nickname', async () => {
    const { service, watchlist } = createService();
    const ctx = contextOf({ chat: CHAT });

    watchlist.list.mockResolvedValue(watchlistOf([PLAYER]));

    await service.watch(ctx);

    expect(ctx.t).toHaveBeenCalledWith('watch-line', { nickname: 'Rival', battles: 12, marks: 1 });
    expect(ctx.reply).toHaveBeenCalledWith('watch-header\nwatch-line', expect.anything());
  });

  it('says the list is empty', async () => {
    const { service, watchlist } = createService();
    const ctx = contextOf({ chat: CHAT });

    watchlist.list.mockResolvedValue(watchlistOf([]));

    await service.watch(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('watch-empty');
  });

  it('adds the resolved player', async () => {
    const { service, watchlist } = createService();
    const ctx = contextOf({ chat: CHAT, match: ' rival ' });

    watchlist.add.mockResolvedValue(watchlistOf([PLAYER]));

    await service.watch(ctx);

    expect(watchlist.add).toHaveBeenCalledWith({ userId: 'user', accountId: 9 });
    expect(ctx.t).toHaveBeenCalledWith('watch-added', { nickname: 'Rival', count: 1, limit: 5 });
  });

  it('explains the limit instead of failing', async () => {
    const { service, watchlist } = createService();
    const ctx = contextOf({ chat: CHAT, match: 'Rival' });

    watchlist.add.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'limit'));

    await service.watch(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('watch-limit', expect.anything());
  });
});
