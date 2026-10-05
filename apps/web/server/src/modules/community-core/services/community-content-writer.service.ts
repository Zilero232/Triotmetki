import { Injectable } from '@nestjs/common';

import type { PurgeAuthoredInput } from '../community-core.types';

import { PrismaService } from '../../../core';

@Injectable()
export class CommunityContentWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async purgeAuthoredBy({ userId, db = this.prisma }: PurgeAuthoredInput): Promise<void> {
    const [builds, guides, boards] = await Promise.all([
      db.build.findMany({ where: { authorUserId: userId }, select: { id: true } }),
      db.guide.findMany({ where: { authorUserId: userId }, select: { id: true } }),
      db.tacticBoard.findMany({ where: { ownerUserId: userId }, select: { id: true } })
    ]);

    const targets = (
      [
        ['build', builds],
        ['guide', guides],
        ['tacticBoard', boards]
      ] as const
    ).flatMap(([target, rows]) => (rows.length > 0 ? [{ target, targetId: { in: rows.map((row) => row.id) } }] : []));

    if (targets.length === 0) {
      return;
    }

    await db.reaction.deleteMany({ where: { OR: targets } });
    await db.comment.deleteMany({ where: { OR: targets } });
  }
}
