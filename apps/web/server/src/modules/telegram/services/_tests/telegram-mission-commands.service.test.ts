import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { MissionProgressReaderService, NextMissions } from '../../../missions';
import type { BotContext, LinkedChat } from '../../telegram.types';

import { TelegramMissionCommandsService } from '../telegram-mission-commands.service';

const CHAT: LinkedChat = { userId: 'user', telegramId: 42n, accountId: 7n, nickname: 'Tanker', locale: 'ru' };

const NEXT: NextMissions = {
  operationName: 'StuG IV',
  campaignId: 1,
  operationId: 2,
  missions: [
    { branchKey: 'lt', title: 'LT-1', condition: 'Spot 5' },
    { branchKey: 'at', title: 'AT-1', condition: null }
  ]
};

const createService = (next: NextMissions | null) => {
  const config = mock<AppConfigService>();
  const missions = mock<MissionProgressReaderService>();

  config.get.mockReturnValue('https://triotmetki.ru');
  missions.next.mockResolvedValue(next);

  return { service: new TelegramMissionCommandsService(config, missions), missions };
};

const contextOf = (chat: LinkedChat | null) => {
  const ctx = mockDeep<BotContext>();

  ctx.chat$ = chat;
  ctx.t.mockImplementation((key) => key);

  return ctx;
};

describe('TelegramMissionCommandsService.lbz', () => {
  it('asks an unlinked chat to link first', async () => {
    const { service, missions } = createService(NEXT);
    const ctx = contextOf(null);

    await service.lbz(ctx);

    expect(missions.next).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('lbz-not-linked');
  });

  it.each([null, { ...NEXT, missions: [] }])('reports nothing to do for %o', async (next) => {
    const { service } = createService(next);
    const ctx = contextOf(CHAT);

    await service.lbz(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('lbz-empty');
  });

  it('lists every open mission with an empty condition for a missing one and links the operation', async () => {
    const { service } = createService(NEXT);
    const ctx = contextOf(CHAT);

    await service.lbz(ctx);

    expect(ctx.t).toHaveBeenCalledWith('lbz-line', expect.objectContaining({ title: 'AT-1', condition: '' }));
    expect(ctx.t.mock.calls.filter(([key]) => key === 'lbz-line')).toHaveLength(NEXT.missions.length);
    expect(ctx.reply.mock.calls[0]?.[1]?.reply_markup).toBeDefined();
  });
});
