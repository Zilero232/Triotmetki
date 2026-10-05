import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { BotStatsReaderService } from '../bot-stats-reader.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { BotRepliesService } from '../bot-replies.service';

const CARD = { accountId: 7n, nickname: 'Tanker', battles: 1000, winRate: 52.5, avgDamage: 1800, wn8: 2100, clanTag: 'RED' };

const createService = () => {
  const config = mock<AppConfigService>();
  const stats = mock<BotStatsReaderService>();

  config.get.mockReturnValue('https://otmetki.app');
  stats.player.mockResolvedValue(CARD);

  return { service: new BotRepliesService(config, stats), stats };
};

describe('BotRepliesService.reply', () => {
  it('asks an unlinked user to link or pass a nickname', async () => {
    const { service } = createService();

    const reply = await service.reply({ command: 'session', locale: 'en', accountId: null, argument: '' });

    expect(reply).toEqual({ text: expect.stringContaining('Link your Lesta account'), link: null, imageUrl: null });
  });

  it('resolves a nickname argument before the linked account and links the profile and stat card', async () => {
    const { service, stats } = createService();

    stats.resolve.mockResolvedValue(9n);

    const reply = await service.reply({ command: 'stats', locale: 'en', accountId: 7n, argument: 'Other' });

    expect(stats.player).toHaveBeenCalledWith(9n);
    expect(reply.text).toContain('Tanker [RED]');
    expect(reply.link).toEqual({ label: 'Open on the site', url: 'https://otmetki.app/p/Tanker' });
    expect(reply.imageUrl).toBe('https://otmetki.app/api/og/player/9');
  });

  it('asks for a tank name and reports an unknown tank', async () => {
    const { service, stats } = createService();

    stats.tank.mockResolvedValue(null);

    expect((await service.reply({ command: 'tank', locale: 'ru', accountId: null, argument: '' })).text).toContain('Укажите название');
    expect((await service.reply({ command: 'tank', locale: 'ru', accountId: null, argument: 'xyz' })).text).toBe('Танк не найден.');
  });

  it('lists the top players', async () => {
    const { service, stats } = createService();

    stats.top.mockResolvedValue([{ nickname: 'Ace', wn8: 3500, battles: 12_000 }]);

    const { text } = await service.reply({ command: 'top', locale: 'en', accountId: null, argument: '' });

    expect(text.split('\n')).toHaveLength(2);
    expect(text).toContain('1. Ace');
  });
});

describe('BotRepliesService.failure', () => {
  it('tells a missing player apart from other errors', () => {
    const { service } = createService();

    expect(service.failure({ locale: 'en', error: new AppNotFoundException('NOT_FOUND', 'no') }).text).toBe('Player not found.');
    expect(service.failure({ locale: 'en', error: new Error('boom') }).text).toContain('Something went wrong');
  });
});
