import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Build, Guide, TacticBoard } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { CommunityContentWriterService } from '../community-content-writer.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.build.findMany.mockResolvedValue([]);
  prisma.guide.findMany.mockResolvedValue([]);
  prisma.tacticBoard.findMany.mockResolvedValue([]);

  return { prisma, service: new CommunityContentWriterService(prisma) };
};

describe('CommunityContentWriterService.purgeAuthoredBy', () => {
  it('deletes every reaction and comment left on the builds, guides and boards of the user', async () => {
    const { prisma, service } = createService();

    prisma.build.findMany.mockResolvedValue([mock<Build>({ id: 'b1' })]);
    prisma.guide.findMany.mockResolvedValue([mock<Guide>({ id: 'g1' }), mock<Guide>({ id: 'g2' })]);
    prisma.tacticBoard.findMany.mockResolvedValue([mock<TacticBoard>({ id: 't1' })]);

    await service.purgeAuthoredBy({ userId: 'u1' });

    const targets = [
      { target: 'build', targetId: { in: ['b1'] } },
      { target: 'guide', targetId: { in: ['g1', 'g2'] } },
      { target: 'tacticBoard', targetId: { in: ['t1'] } }
    ];

    expect(prisma.build.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorUserId: 'u1' } }));
    expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({ where: { OR: targets } });
    expect(prisma.comment.deleteMany).toHaveBeenCalledWith({ where: { OR: targets } });
  });

  it('leaves out the kinds of content the user never wrote', async () => {
    const { prisma, service } = createService();

    prisma.guide.findMany.mockResolvedValue([mock<Guide>({ id: 'g1' })]);

    await service.purgeAuthoredBy({ userId: 'u1' });

    expect(prisma.comment.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ target: 'guide', targetId: { in: ['g1'] } }] } });
  });

  it('touches no reactions or comments for a user without content', async () => {
    const { prisma, service } = createService();

    await service.purgeAuthoredBy({ userId: 'u1' });

    expect(prisma.reaction.deleteMany).not.toHaveBeenCalled();
    expect(prisma.comment.deleteMany).not.toHaveBeenCalled();
  });

  it('runs inside the transaction it is given', async () => {
    const { prisma, service } = createService();
    const tx = mockDeep<PrismaService>();

    tx.build.findMany.mockResolvedValue([mock<Build>({ id: 'b1' })]);
    tx.guide.findMany.mockResolvedValue([]);
    tx.tacticBoard.findMany.mockResolvedValue([]);

    await service.purgeAuthoredBy({ userId: 'u1', db: tx });

    expect(tx.reaction.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.build.findMany).not.toHaveBeenCalled();
  });
});
