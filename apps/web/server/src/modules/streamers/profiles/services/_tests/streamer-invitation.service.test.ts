import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { StreamerInvitation } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';

import { AppNotFoundException } from '../../../../../common/exceptions';
import { STREAMER_INVITATIONS } from '../../config/directory.constants';
import { StreamerInvitationService } from '../streamer-invitation.service';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const SLUG = 'jove';
const CHANNELS = [{ platform: 'twitch', url: 'https://www.twitch.tv/Jove' }];

const invitation = (overrides: Partial<StreamerInvitation> = {}): StreamerInvitation => ({
  id: 'inv-1',
  slug: SLUG,
  displayName: 'Jove',
  channels: CHANNELS,
  sourceUrl: null,
  status: 'pending',
  sentAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new StreamerInvitationService(prisma), prisma };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamerInvitationService.seed', () => {
  it('inserts every configured invitation in one write without overwriting existing ones', async () => {
    const { service, prisma } = createService();

    const seeded = await service.seed();

    expect(seeded).toBe(STREAMER_INVITATIONS.length);
    expect(prisma.streamerInvitation.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.streamerInvitation.createMany.mock.calls[0]?.[0]?.skipDuplicates).toBe(true);
    expect(prisma.streamerInvitation.createMany.mock.calls[0]?.[0]?.data).toHaveLength(STREAMER_INVITATIONS.length);
  });
});

describe('StreamerInvitationService.list', () => {
  it('shows malformed stored channels as an empty list', async () => {
    const { service, prisma } = createService();

    prisma.streamerInvitation.findMany.mockResolvedValue([invitation({ channels: 'broken' }), invitation({ slug: 'other', sentAt: NOW })]);

    const views = await service.list();

    expect(views.map(({ channels }) => channels)).toEqual([[], CHANNELS]);
    expect(views[1]?.sentAt).toBe(NOW.toISOString());
  });
});

describe('StreamerInvitationService.markSent', () => {
  it('fails when no pending invitation matches', async () => {
    const { service, prisma } = createService();

    prisma.streamerInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markSent(SLUG)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('marks a pending invitation as sent now', async () => {
    const { service, prisma } = createService();

    prisma.streamerInvitation.updateMany.mockResolvedValue({ count: 1 });

    await service.markSent(SLUG);

    expect(prisma.streamerInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: SLUG, status: 'pending' },
        data: { status: 'sent', sentAt: NOW }
      })
    );
  });
});
