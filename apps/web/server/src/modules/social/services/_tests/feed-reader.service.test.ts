import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountBadge, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { TankEventRow } from '../../queries/snapshot-events.types';
import type { FollowReaderService } from '../follow-reader.service';
import type { SnapshotEventsReaderService } from '../snapshot-events-reader.service';

import { CHALLENGE_BADGES } from '../../config/challenges.constants';
import { FEED } from '../../config/feed.constants';
import { FeedReaderService } from '../feed-reader.service';

const at = new Date('2026-09-20T12:00:00Z');
const days = 7;

const player: Player = {
  accountId: 1n,
  nickname: 'Tanker',
  clanId: null,
  createdAt: null,
  lastBattleAt: null,
  trackingTier: 'population',
  lastPolledAt: null,
  nextPollAt: null,
  lastViewedAt: null,
  isHidden: false,
  logoutAt: null,
  progressionProcessedUntil: null,
  updatedAt: at
};

const mark: TankEventRow = {
  accountId: 1,
  tankId: 10,
  capturedAt: at,
  marksOnGun: 3,
  prevMarks: 2,
  markOfMastery: 0,
  prevMastery: null
};

const badge: AccountBadge = { accountId: 2n, badgeCode: 'weekly-battles-50', context: null, awardedAt: new Date(at.getTime() - 1_000) };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const follows = mock<FollowReaderService>();
  const events = mock<SnapshotEventsReaderService>();

  follows.circle.mockResolvedValue({ accountIds: [1n, 2n], own: new Set([1n]) });
  events.tankEvents.mockResolvedValue([mark]);
  events.recordEvents.mockResolvedValue([]);
  prisma.accountBadge.findMany.mockResolvedValue([badge]);
  prisma.player.findMany.mockResolvedValue([player]);

  return { service: new FeedReaderService(prisma, follows, events), prisma, follows, events };
};

describe('FeedReaderService.feed', () => {
  it('merges marks and badges of the circle, newest first, with nicknames', async () => {
    const { service } = createService();

    const { items } = await service.feed({ userId: 'u1', days });

    expect(items.map((item) => [item.kind, item.accountId, item.nickname])).toEqual([
      ['mark', 1, 'Tanker'],
      ['badge', 2, null]
    ]);
  });

  it('names the challenge behind a weekly badge', async () => {
    const { service } = createService();

    const { items } = await service.feed({ userId: 'u1', days });

    expect(items.find((item) => item.kind === 'badge')?.badge).toMatchObject({
      code: badge.badgeCode,
      challenge: { code: badge.badgeCode.slice(CHALLENGE_BADGES.prefix.length) }
    });
  });

  it('looks back exactly the requested number of days for the whole circle', async () => {
    const { service, events } = createService();

    await service.feed({ userId: 'u1', days });

    const [window] = events.tankEvents.mock.calls[0] ?? [];

    expect(window?.accountIds).toEqual([1n, 2n]);
    expect((window?.until.getTime() ?? 0) - (window?.since.getTime() ?? 0)).toBe(days * 86_400_000);
  });

  it('caps the feed at the configured length', async () => {
    const { service, events } = createService();

    events.tankEvents.mockResolvedValue(Array.from({ length: FEED.limit + 5 }, (_, index) => ({ ...mark, tankId: index })));

    expect((await service.feed({ userId: 'u1', days })).items).toHaveLength(FEED.limit);
  });
});
