import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Player, PlaySession, Prisma, StreamerProfile, User } from '../../../../../../generated';
import type { AppConfigService } from '../../../../../config';
import type { PrismaService } from '../../../../../core';

import { CHAT_COPY } from '../../config/chat.constants';
import { chatText, chatValue } from '../../lib/chat-copy';
import { StreamerStatsService } from '../streamer-stats.service';

const ACCOUNT = 1001n;

type MarksGroup = Awaited<ReturnType<PrismaService['playerTank']['groupBy']>>[number];

const marksGroup = (marksOnGun: number, count: number) => mock<MarksGroup>({ marksOnGun, _count: { _all: count } });

const createService = ({
  locale = 'en',
  accountId = ACCOUNT,
  settings = null
}: { locale?: string | null; accountId?: bigint | null; settings?: Prisma.JsonObject | null } = {}) => {
  const prisma = mockDeep<PrismaService>();

  prisma.user.findUnique.mockResolvedValue(locale === null ? null : mock<User>({ locale }));
  prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ id: 'p1', slug: 'jove', accountId, displayName: 'Jove', settings }));
  prisma.player.findUnique.mockResolvedValue(mock<Player>({ nickname: 'Jove_WoT' }));

  const config = mock<AppConfigService>();

  config.get.mockReturnValue('https://triotmetki.ru');

  return { service: new StreamerStatsService(prisma, config), prisma };
};

describe('StreamerStatsService.chatLocale', () => {
  it('follows the streamer’s own locale', async () => {
    const { service } = createService({ locale: 'en-GB' });

    expect(await service.chatLocale('u1')).toBe('en');
  });

  it('falls back to the same locale for a missing user and an unsupported locale', async () => {
    const unset = await createService({ locale: null }).service.chatLocale('u1');
    const unsupported = await createService({ locale: 'xx' }).service.chatLocale('u1');

    expect(unset).toBe(unsupported);
  });
});

describe('StreamerStatsService.reply', () => {
  it('stays silent for a streamer without a linked game account', async () => {
    const { service, prisma } = createService({ accountId: null });

    expect(await service.reply({ streamerUserId: 'u1', command: 'stat' })).toBeNull();
    expect(prisma.accountRating.findUnique).not.toHaveBeenCalled();
  });

  it('answers !stat with the overall rating under the in-game nickname', async () => {
    const { service, prisma } = createService();

    prisma.accountRating.findUnique.mockResolvedValue(mock<AccountRating>({ wn8: 2400, winRate: 56.1, battles: 30000 }));

    expect(await service.reply({ streamerUserId: 'u1', command: 'stat' })).toBe(
      chatText({ locale: 'en', message: CHAT_COPY.messages.stat, values: { nickname: 'Jove_WoT', wn8: 2400, winRate: 56.1, battles: 30000 } })
    );
  });

  it('answers !stat with missing marks when there is no rating yet', async () => {
    const { service, prisma } = createService();

    prisma.accountRating.findUnique.mockResolvedValue(null);

    expect(await service.reply({ streamerUserId: 'u1', command: 'stat' })).toBe(
      chatText({
        locale: 'en',
        message: CHAT_COPY.messages.stat,
        values: { nickname: 'Jove_WoT', wn8: chatValue(null), winRate: chatValue(null), battles: chatValue(null) }
      })
    );
  });

  it('uses the display name when the player is not known yet', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(null);
    prisma.playSession.findFirst.mockResolvedValue(null);

    expect(await service.reply({ streamerUserId: 'u1', command: 'session' })).toBe(
      chatText({ locale: 'en', message: CHAT_COPY.messages.sessionNone, values: { nickname: 'Jove' } })
    );
  });

  it('answers !session with the win rate and average damage of the latest session', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(mock<PlaySession>({ battles: 8, wins: 5, damageDealt: 24000 }));

    expect(await service.reply({ streamerUserId: 'u1', command: 'session' })).toBe(
      chatText({
        locale: 'en',
        message: CHAT_COPY.messages.session,
        values: { nickname: 'Jove_WoT', battles: 8, winRate: (5 / 8) * 100, avgDamage: 24000 / 8 }
      })
    );
  });

  it('answers !settings with the settings page link even without a game account', async () => {
    const { service } = createService({ accountId: null, settings: {} });

    expect(await service.reply({ streamerUserId: 'u1', command: 'settings' })).toBe(
      chatText({ locale: 'en', message: CHAT_COPY.messages.settings, values: { name: 'Jove', url: 'https://triotmetki.ru/s/jove/settings' } })
    );
  });

  it('answers !settings with a hint when nothing is shared yet', async () => {
    const { service } = createService();

    expect(await service.reply({ streamerUserId: 'u1', command: 'settings' })).toBe(
      chatText({ locale: 'en', message: CHAT_COPY.messages.settingsNone, values: { name: 'Jove', url: 'https://triotmetki.ru/s/jove/settings' } })
    );
  });

  it('answers !marks with zero for mark counts the player has none of', async () => {
    const { service, prisma } = createService();

    vi.mocked(prisma.playerTank.groupBy).mockResolvedValue([marksGroup(3, 12), marksGroup(1, 40)]);

    expect(await service.reply({ streamerUserId: 'u1', command: 'marks' })).toBe(
      chatText({ locale: 'en', message: CHAT_COPY.messages.marks, values: { nickname: 'Jove_WoT', moe3: 12, moe2: 0, moe1: 40 } })
    );
  });
});
