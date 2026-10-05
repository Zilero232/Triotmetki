import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PlaySession } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { WebhookEmitter } from '../../../webhooks';
import type { SessionEventsSink } from '../../developer.types';

import { SessionCloseService } from '../session-close.service';

type SessionFixture = Partial<PlaySession> & { player?: { clanId: bigint | null; nickname: string; logoutAt: Date | null } };

const session = (overrides: SessionFixture = {}) => ({
  ...mock<PlaySession>(),
  id: 'session',
  accountId: 1n,
  source: 'mod' as const,
  battles: 4,
  wins: 3,
  damageDealt: 8_000,
  wn8: 2_000,
  startedAt: new Date('2026-09-25T10:00:00Z'),
  lastActivityAt: new Date('2026-09-25T11:00:00Z'),
  player: { clanId: 10n, nickname: 'Tanker', logoutAt: null },
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const webhooks = mock<WebhookEmitter>();
  const sessionEvents = mock<SessionEventsSink>();

  prisma.playSession.updateMany.mockResolvedValue({ count: 1 });

  return { service: new SessionCloseService(prisma, webhooks, sessionEvents), prisma, webhooks, sessionEvents };
};

describe('SessionCloseService.closeIdle', () => {
  it('closes a session the player logged out of before the idle timeout', async () => {
    const { service, prisma } = createService();
    const lastActivityAt = new Date('2026-09-25T11:00:00Z');
    const now = new Date('2026-09-25T11:05:00Z');

    prisma.playSession.findMany.mockResolvedValue([
      session({ id: 'left', lastActivityAt, player: { clanId: 10n, nickname: 'Tanker', logoutAt: new Date('2026-09-25T11:02:00Z') } }),
      session({ id: 'playing', lastActivityAt, player: { clanId: 10n, nickname: 'Tanker', logoutAt: new Date('2026-09-25T09:00:00Z') } })
    ]);

    await expect(service.closeIdle(now)).resolves.toBe(1);
    expect(prisma.playSession.updateMany).toHaveBeenCalledOnce();
    expect(prisma.playSession.updateMany.mock.calls[0]?.[0]?.where).toMatchObject({ id: 'left' });
  });

  it('closes an idle session and announces it to the player and the clan', async () => {
    const { service, prisma, webhooks } = createService();

    prisma.playSession.findMany.mockResolvedValue([session()]);

    await expect(service.closeIdle()).resolves.toBe(1);
    expect(webhooks.emit).toHaveBeenCalledWith(expect.objectContaining({ event: 'session.ended', subject: { accountIds: [1], clanIds: [10] } }));
  });

  it('closes an empty session without announcing it', async () => {
    const { service, prisma, webhooks } = createService();

    prisma.playSession.findMany.mockResolvedValue([session({ battles: 0, wins: 0 })]);

    await expect(service.closeIdle()).resolves.toBe(0);
    expect(prisma.playSession.updateMany).toHaveBeenCalled();
    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('does not announce a session another worker closed first', async () => {
    const { service, prisma, webhooks } = createService();

    prisma.playSession.findMany.mockResolvedValue([session()]);
    prisma.playSession.updateMany.mockResolvedValue({ count: 0 });

    await service.closeIdle();

    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('never closes or announces an api day rollup', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findMany.mockResolvedValue([]);

    await service.closeIdle();

    expect(prisma.playSession.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ kind: 'live' });
  });

  it('tells the session listeners when a mod session with battles ends', async () => {
    const { service, prisma, sessionEvents } = createService();

    prisma.playSession.findMany.mockResolvedValue([session(), session({ id: 'api-day', source: 'api' }), session({ id: 'empty', battles: 0 })]);

    await service.closeIdle();

    expect(sessionEvents.ended.mock.calls).toEqual([[{ sessionId: 'session', accountId: 1n }]]);
  });
});
