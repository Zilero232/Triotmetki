import type { Playlist, PlaylistItem } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { PlaylistReaderService } from '../../../analytics';
import type { BotContext, LinkedChat } from '../../telegram.types';

import { unknownVehicle } from '../../../reference';
import { TelegramPlaylistCommandsService } from '../telegram-playlist-commands.service';

const CHAT: LinkedChat = { userId: 'user', telegramId: 42n, accountId: 7n, nickname: 'Tanker', locale: 'ru' };

const ITEM: PlaylistItem = {
  vehicle: { ...unknownVehicle(1), shortName: 'IS-7' },
  reasons: ['closeToMark', 'longUnplayed'],
  battles: 10,
  winRate: 50,
  moePercent: 83.26,
  nextMarkPercent: 85,
  damageToNextMark: 120,
  daysSinceBattle: null,
  isFirstWinAvailable: false
};

const playlist = (overrides: Partial<Playlist>): Playlist => ({
  accountId: 7,
  state: 'ready',
  isExtended: false,
  size: 3,
  seed: 0,
  items: [ITEM],
  ...overrides
});

const createService = (result: Playlist) => {
  const config = mock<AppConfigService>();
  const playlists = mock<PlaylistReaderService>();

  config.get.mockReturnValue('https://triotmetki.ru');
  playlists.playlist.mockResolvedValue(result);

  return { service: new TelegramPlaylistCommandsService(config, playlists), playlists };
};

const contextOf = (chat: LinkedChat | null) => {
  const ctx = mockDeep<BotContext>();

  ctx.chat$ = chat;
  ctx.t.mockImplementation((key) => key);

  return ctx;
};

describe('TelegramPlaylistCommandsService.next', () => {
  it('asks an unlinked chat to link first without building a playlist', async () => {
    const { service, playlists } = createService(playlist({}));
    const ctx = contextOf(null);

    await service.next(ctx);

    expect(playlists.playlist).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('next-not-linked');
  });

  it.each([
    ['noLink', [ITEM], 'next-not-linked'],
    ['noGarage', [ITEM], 'next-no-garage'],
    ['ready', [], 'next-empty']
  ] as const)('answers %s with %j items by %s', async (state, items, key) => {
    const { service } = createService(playlist({ state, items: [...items] }));
    const ctx = contextOf(CHAT);

    await service.next(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(key);
  });

  it('rounds the MoE percent to one decimal and treats unknown days as zero', async () => {
    const { service } = createService(playlist({}));
    const ctx = contextOf(CHAT);

    await service.next(ctx);

    expect(ctx.t).toHaveBeenCalledWith('next-reason-closeToMark', { percent: 83.3, days: 0 });
  });

  it('hints at the Plus playlist size only for a free playlist', async () => {
    const free = createService(playlist({ isExtended: false }));
    const plus = createService(playlist({ isExtended: true }));
    const freeCtx = contextOf(CHAT);
    const plusCtx = contextOf(CHAT);

    await free.service.next(freeCtx);
    await plus.service.next(plusCtx);

    expect(freeCtx.t.mock.calls.some(([key]) => key === 'next-plus-hint')).toBe(true);
    expect(plusCtx.t.mock.calls.some(([key]) => key === 'next-plus-hint')).toBe(false);
  });
});
