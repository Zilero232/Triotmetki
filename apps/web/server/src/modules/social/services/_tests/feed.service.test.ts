import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountBadge, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { SnapshotEventRow } from '../../queries';
import type { FollowService } from '../follow.service';
import type { SnapshotEventsService } from '../snapshot-events.service';

import { CHALLENGE_BADGES, FEED } from '../../config';
import { FeedService } from '../feed.service';

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

const mark: SnapshotEventRow = {
  account_id: 1n,
  tank_id: 10,
  captured_at: at,
  marks_on_gun: 3,
  prev_marks: 2,
  mark_of_mastery: 0,
  prev_mastery: null
};

const badge: AccountBadge = { accountId: 2n, badgeCode: 'weekly-battles-50', context: null, awardedAt: new Date(at.getTime() - 1_000) };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const follows = mock<FollowService>();
  const events = mock<SnapshotEventsService>();

  follows.circle.mockResolvedValue({ accountIds: [1n, 2n], own: new Set([1n]) });
  events.tankEvents.mockResolvedValue([mark]);
  events.recordEvents.mockResolvedValue([]);
  prisma.accountBadge.findMany.mockResolvedValue([badge]);
  prisma.player.findMany.mockResolvedValue([player]);

  return { service: new FeedService(prisma, follows, events), prisma, follows, events };
};

describe('FeedService.feed', () => {
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

    events.tankEvents.mockResolvedValue(Array.from({ length: FEED.limit + 5 }, (_, index) => ({ ...mark, tank_id: index })));

    expect((await service.feed({ userId: 'u1', days })).items).toHaveLength(FEED.limit);
  });
});
