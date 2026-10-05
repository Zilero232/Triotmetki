import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { ContentReport, Prisma } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppNotFoundException } from '../../../../common/exceptions';
import { ModerationService } from '../moderation.service';

const now = new Date('2026-09-25T12:00:00Z');
const targetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const report: ContentReport = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  reporterUserId: 'reporter',
  targetType: 'build',
  targetId,
  reason: 'spam',
  details: null,
  status: 'open',
  resolvedBy: null,
  createdAt: now,
  resolvedAt: null
};

const createService = (row: ContentReport | null = report) => {
  const prisma = mockDeep<PrismaService>();

  prisma.contentReport.findUnique.mockResolvedValue(row);
  prisma.contentReport.update.mockResolvedValue({ ...report, status: 'resolved', resolvedBy: 'moderator', resolvedAt: now });
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return { service: new ModerationService(prisma), prisma };
};

describe('ModerationService.resolve', () => {
  it('hides the reported target when asked', async () => {
    const { service, prisma } = createService();

    await service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true });

    expect(prisma.build.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: targetId }), data: expect.objectContaining({ status: 'hidden' }) })
    );
  });

  it('leaves the target alone without hideTarget', async () => {
    const { service, prisma } = createService();

    await service.resolve({ id: report.id, userId: 'moderator', status: 'dismissed', hideTarget: false });

    expect(prisma.build.updateMany).not.toHaveBeenCalled();
  });

  it('makes a reported replay private instead of deleting it', async () => {
    const { service, prisma } = createService({ ...report, targetType: 'replay' });

    await service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true });

    expect(prisma.replay.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: targetId }),
        data: expect.objectContaining({ visibility: 'private', hiddenAt: expect.any(Date) })
      })
    );
  });

  it('takes a streamer profile off the directory and off air when a removal request is upheld', async () => {
    const { service, prisma } = createService({ ...report, targetType: 'streamer_profile', reason: 'other', details: 'mail@example.com' });

    await service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true });

    expect(prisma.streamerProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: targetId }, data: { hiddenAt: expect.any(Date), isLive: false } })
    );
  });

  it('resolves the other open reports on the same target', async () => {
    const { service, prisma } = createService();

    await service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true });

    expect(prisma.contentReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ targetType: 'build', targetId, status: 'open', id: { not: report.id } }),
        data: expect.objectContaining({ status: 'resolved', resolvedBy: 'moderator' })
      })
    );
  });

  it('writes an audit entry', async () => {
    const { service, prisma } = createService();

    await service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorUserId: 'moderator', action: 'report.resolved', entityType: 'build', entityId: targetId })
      })
    );
  });

  it('hides the target in the same transaction that resolves the report', async () => {
    const { service, prisma } = createService();
    const db = mockDeep<Prisma.TransactionClient>();

    db.contentReport.update.mockResolvedValue({ ...report, status: 'resolved', resolvedBy: 'moderator', resolvedAt: now });
    prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(db) : Promise.all(run)));

    await service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true });

    expect(db.build.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: targetId }), data: expect.objectContaining({ status: 'hidden' }) })
    );

    expect(prisma.build.updateMany).not.toHaveBeenCalled();
  });

  it('refuses an unknown report', async () => {
    const { service, prisma } = createService(null);

    await expect(service.resolve({ id: report.id, userId: 'moderator', status: 'resolved', hideTarget: true })).rejects.toBeInstanceOf(
      AppNotFoundException
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('ModerationService.moderate', () => {
  it('throws when nothing matched', async () => {
    const { service, prisma } = createService();

    prisma.comment.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.moderate({ target: 'comment', id: targetId, status: 'hidden' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('stamps publishedAt when a guide is published', async () => {
    const { service, prisma } = createService();

    prisma.guide.updateMany.mockResolvedValue({ count: 1 });

    await service.moderate({ target: 'guide', id: targetId, status: 'published' });

    expect(prisma.guide.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: targetId }),
        data: expect.objectContaining({ status: 'published', publishedAt: expect.any(Date) })
      })
    );
  });

  it('does not stamp publishedAt when a guide is hidden', async () => {
    const { service, prisma } = createService();

    prisma.guide.updateMany.mockResolvedValue({ count: 1 });

    await service.moderate({ target: 'guide', id: targetId, status: 'hidden' });

    expect(prisma.guide.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: targetId }), data: expect.objectContaining({ status: 'hidden' }) })
    );

    expect(prisma.guide.updateMany.mock.calls[0]?.[0].data).not.toHaveProperty('publishedAt');
  });
});
