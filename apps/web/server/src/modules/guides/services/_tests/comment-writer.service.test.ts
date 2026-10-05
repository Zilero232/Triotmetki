import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Build, Comment, Guide } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { CommentWriterService } from '../comment-writer.service';

const targetId = '33333333-3333-4333-8333-333333333333';
const parentId = '44444444-4444-4444-8444-444444444444';

const comment: Comment & { author: { id: string; name: string; image: string | null } } = {
  id: '55555555-5555-4555-8555-555555555555',
  authorUserId: 'u1',
  target: 'build',
  targetId,
  parentId: null,
  body: 'Nice build',
  status: 'published',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  author: { id: 'u1', name: 'User', image: null }
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.build.findFirst.mockResolvedValue(mock<Build>({ id: targetId }));
  prisma.comment.create.mockResolvedValue(comment);

  return { service: new CommentWriterService(prisma), prisma };
};

describe('CommentWriterService.create', () => {
  it('refuses a target id that is not a uuid without querying', async () => {
    const { service, prisma } = createService();

    await expect(service.create({ userId: 'u1', target: 'build', targetId: 'not-a-uuid', body: 'Hi' })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.build.findFirst).not.toHaveBeenCalled();
  });

  it('refuses a target that does not exist', async () => {
    const { service, prisma } = createService();

    prisma.guide.findFirst.mockResolvedValue(null);

    await expect(service.create({ userId: 'u1', target: 'guide', targetId, body: 'Hi' })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it('looks the target up in the table of its kind', async () => {
    const { service, prisma } = createService();

    prisma.guide.findFirst.mockResolvedValue(mock<Guide>({ id: targetId }));
    prisma.comment.create.mockResolvedValue({ ...comment, target: 'guide' });

    await service.create({ userId: 'u1', target: 'guide', targetId, body: 'Hi' });

    expect(prisma.guide.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetId, OR: [{ status: 'published' }, { authorUserId: 'u1' }] },
        select: { id: true }
      })
    );

    expect(prisma.build.findFirst).not.toHaveBeenCalled();
  });

  it('refuses a parent from another thread', async () => {
    const { service, prisma } = createService();

    prisma.comment.findUnique.mockResolvedValue({ ...comment, id: parentId, targetId: '66666666-6666-4666-8666-666666666666' });

    await expect(service.create({ userId: 'u1', target: 'build', targetId, parentId, body: 'Hi' })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it('refuses a parent on the same id but another target kind', async () => {
    const { service, prisma } = createService();

    prisma.comment.findUnique.mockResolvedValue({ ...comment, id: parentId, target: 'guide' });

    await expect(service.create({ userId: 'u1', target: 'build', targetId, parentId, body: 'Hi' })).rejects.toBeInstanceOf(AppBadRequestException);
  });

  it('refuses a missing parent', async () => {
    const { service, prisma } = createService();

    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(service.create({ userId: 'u1', target: 'build', targetId, parentId, body: 'Hi' })).rejects.toBeInstanceOf(AppBadRequestException);
  });

  it('stores a reply in the same thread', async () => {
    const { service, prisma } = createService();

    prisma.comment.findUnique.mockResolvedValue({ ...comment, id: parentId });
    prisma.comment.create.mockResolvedValue({ ...comment, parentId });

    expect((await service.create({ userId: 'u1', target: 'build', targetId, parentId, body: 'Hi' })).parentId).toBe(parentId);
  });
});

describe('CommentWriterService.list', () => {
  it('refuses the thread of a target the viewer cannot see', async () => {
    const { service, prisma } = createService();

    prisma.replay.findFirst.mockResolvedValue(null);

    await expect(service.list({ target: 'replay', targetId, viewerUserId: null })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.comment.findMany).not.toHaveBeenCalled();
  });

  it('gives an anonymous viewer no owner shortcut to a private target', async () => {
    const { service, prisma } = createService();

    prisma.tacticBoard.findFirst.mockResolvedValue(null);

    await expect(service.list({ target: 'tacticBoard', targetId, viewerUserId: null })).rejects.toBeInstanceOf(AppNotFoundException);

    expect(prisma.tacticBoard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetId, OR: [{ visibility: { not: 'private' } }] },
        select: { id: true }
      })
    );
  });

  it('returns the newest page of the thread in chronological order', async () => {
    const { service, prisma } = createService();
    const older = { ...comment, id: '77777777-7777-4777-8777-777777777777', createdAt: new Date('2025-12-31T00:00:00Z') };

    prisma.comment.findMany.mockResolvedValue([comment, older]);

    const items = await service.list({ target: 'build', targetId, viewerUserId: null });

    expect(prisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: 'desc' } }));
    expect(items.map((item) => item.id)).toEqual([older.id, comment.id]);
  });
});

describe('CommentWriterService.remove', () => {
  it('refuses a comment of another user', async () => {
    const { service, prisma } = createService();

    prisma.comment.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.remove({ id: comment.id, userId: 'other' })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});
