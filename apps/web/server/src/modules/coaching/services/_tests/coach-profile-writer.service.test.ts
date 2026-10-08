import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';
import type { CommunityAccountsReaderService } from '../../../community-core';

import { AppNotFoundException } from '../../../../common/exceptions';
import { CoachProfileWriterService } from '../coach-profile-writer.service';

const now = new Date('2026-09-25T12:00:00Z');

const coach = {
  userId: 'coach',
  accountId: 7n,
  headline: 'Heavy tanks coach',
  bio: null,
  contacts: { telegram: 'https://t.me/coach' },
  tankIds: [],
  isActive: true,
  rating: null,
  ordersDone: 0,
  hiddenAt: null,
  createdAt: now,
  updatedAt: now,
  user: { id: 'coach', name: 'Coach', image: null },
  offers: []
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const accounts = mock<CommunityAccountsReaderService>();

  accounts.statsOf.mockResolvedValue(new Map());

  return { service: new CoachProfileWriterService(prisma, accounts), prisma };
};

describe('CoachProfileWriterService.get', () => {
  it('hides the contacts of a coach hidden by moderation from other users', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findUnique.mockResolvedValue({ ...coach, isActive: false, hiddenAt: now });

    await expect(service.get({ userId: 'coach', viewerUserId: 'someone' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('hides a coach who switched the listing off from anonymous visitors', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findUnique.mockResolvedValue({ ...coach, isActive: false });

    await expect(service.get({ userId: 'coach', viewerUserId: null })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('shows only active offers to other users', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findUnique.mockResolvedValue(coach);

    await service.get({ userId: 'coach', viewerUserId: null });

    expect(prisma.coachProfile.findUnique.mock.calls[0]?.[0].include?.offers).toMatchObject({ where: { isActive: true } });
  });

  it('still shows the owner a hidden profile', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findUnique.mockResolvedValue({ ...coach, isActive: false, hiddenAt: now });

    await expect(service.get({ userId: 'coach', viewerUserId: 'coach' })).resolves.toMatchObject({ userId: 'coach' });
  });
});

describe('CoachProfileWriterService.upsertProfile', () => {
  it('keeps the stored listing switch when the edit leaves it out', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findUnique.mockResolvedValue(coach);

    await service.upsertProfile({ userId: 'coach', accountId: 7, headline: 'Heavy tanks coach', contacts: {}, tankIds: [] });

    expect(prisma.coachProfile.upsert.mock.calls[0]?.[0].update).not.toHaveProperty('isActive');
  });
});
