import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player, UserLestaAccount } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { WebhookEmitter } from '../../../../webhooks';

import { TrackingAnnounceService } from '../tracking-announce.service';

const createAnnounce = () => {
  const prisma = mockDeep<PrismaService>();
  const webhooks = mock<WebhookEmitter>();

  return { prisma, webhooks, announce: new TrackingAnnounceService(prisma, webhooks) };
};

const gained = { accountId: 1n, tankId: 10, marks: 2, previous: 1 };

describe('TrackingAnnounceService.announceMarks', () => {
  it('emits nothing when no mark was gained', async () => {
    const { webhooks, announce } = createAnnounce();

    await announce.announceMarks([]);

    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('emits a mark.gained event addressed to the player and their clan', async () => {
    const { prisma, webhooks, announce } = createAnnounce();

    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: gained.accountId, clanId: 7n, nickname: 'tanker' })]);

    await announce.announceMarks([gained]);

    expect(webhooks.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'mark.gained',
        subject: { accountIds: [1], clanIds: [7] },
        data: expect.objectContaining({ nickname: 'tanker', tankId: gained.tankId, marks: gained.marks, previousMarks: gained.previous })
      })
    );
  });

  it('still emits for an unknown player, without a clan or nickname', async () => {
    const { prisma, webhooks, announce } = createAnnounce();

    prisma.player.findMany.mockResolvedValue([]);

    await announce.announceMarks([gained]);

    expect(webhooks.emit).toHaveBeenCalledWith(
      expect.objectContaining({ subject: { accountIds: [1], clanIds: [] }, data: expect.objectContaining({ nickname: null }) })
    );
  });
});

describe('TrackingAnnounceService.announceMarks dedupe', () => {
  it('keys the event by account, tank and marks so a repeated announcement is delivered once', async () => {
    const { prisma, webhooks, announce } = createAnnounce();

    prisma.player.findMany.mockResolvedValue([]);

    await announce.announceMarks([gained]);
    await announce.announceMarks([gained]);

    const keys = webhooks.emit.mock.calls.map(([input]) => input.dedupeKey);

    expect(keys[0]).toBeDefined();
    expect(keys[0]).toBe(keys[1]);
  });
});

describe('TrackingAnnounceService.subscribers', () => {
  it('returns the linked accounts whose user holds an entitled subscription', async () => {
    const { prisma, announce } = createAnnounce();

    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 2n })]);

    expect(await announce.subscribers([1n, 2n])).toEqual(new Set([2]));
  });
});
