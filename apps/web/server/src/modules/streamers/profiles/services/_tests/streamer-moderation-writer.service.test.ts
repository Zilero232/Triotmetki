import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { StreamerProfileWriterService } from '../streamer-profile-writer.service';

import { AppForbiddenException, AppNotFoundException } from '../../../../../common/exceptions';
import { REMOVAL_REPORT } from '../../config/directory.constants';
import { StreamerModerationWriterService } from '../streamer-moderation-writer.service';

const NOW = new Date('2026-09-01T12:00:00.000Z');
const USER = 'user-1';
const SLUG = 'jove';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const profiles = mock<StreamerProfileWriterService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.streamerProfile.findUnique.mockResolvedValue(null);

  return { service: new StreamerModerationWriterService(prisma, profiles), prisma, profiles };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamerModerationWriterService.hide', () => {
  it('rejects an unknown slug', async () => {
    const { service } = createService();

    await expect(service.hide(SLUG)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('hides the profile, takes it off air and closes its open removal requests', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ id: 'p1' }));

    await service.hide(SLUG);

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { hiddenAt: NOW, isLive: false } })
    );

    expect(prisma.contentReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetType: REMOVAL_REPORT.targetType, targetId: 'p1', status: 'open' },
        data: { status: 'resolved', resolvedAt: NOW }
      })
    );
  });
});

describe('StreamerModerationWriterService.requestRemoval', () => {
  it('files the request as a content report against the profile with the contact as details', async () => {
    const { service, prisma, profiles } = createService();

    profiles.publicBySlug.mockResolvedValue(mock<StreamerProfile>({ id: 'p1' }));

    await service.requestRemoval({ slug: SLUG, contact: 'mail@example.com', reason: 'not me', userId: null });

    expect(prisma.contentReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reporterUserId: null, targetType: REMOVAL_REPORT.targetType, targetId: 'p1', reason: 'not me', details: 'mail@example.com' }
      })
    );
  });

  it('falls back to the default reason and keeps the signed-in reporter', async () => {
    const { service, prisma, profiles } = createService();

    profiles.publicBySlug.mockResolvedValue(mock<StreamerProfile>({ id: 'p1' }));

    await service.requestRemoval({ slug: SLUG, contact: '@jove', userId: USER });

    expect(prisma.contentReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reporterUserId: USER, reason: REMOVAL_REPORT.reason })
      })
    );
  });
});

describe('StreamerModerationWriterService.createEditorial', () => {
  it('refuses editorial entries while they are disabled', async () => {
    const { service, prisma } = createService();

    await expect(service.createEditorial({ slug: SLUG, displayName: 'Jove', channels: [] })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.streamerProfile.create).not.toHaveBeenCalled();
  });
});
