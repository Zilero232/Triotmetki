import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { BEST_OF_WEEK } from '../../config';
import { BestOfWeekService } from '../best-of-week.service';

const now = new Date('2026-09-21T00:10:00Z');

const recordedBy = ({ id, accountId }: Pick<Replay, 'accountId' | 'id'>) => ({
  ...mock<Replay>({ id, accountId }),
  uploader: { lestaAccounts: [{ accountId: accountId ?? 0n }] }
});

describe('BestOfWeekService.feature', () => {
  it('marks the top replays of the previous Moscow week as featured', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.replay.findMany.mockResolvedValue([recordedBy({ id: 'a', accountId: 1n }), recordedBy({ id: 'b', accountId: 2n })]);
    prisma.replay.updateMany.mockResolvedValue({ count: 2 });

    expect(await new BestOfWeekService(prisma).feature(now)).toBe(2);

    const query = prisma.replay.findMany.mock.calls[0]?.[0];

    expect(query).toMatchObject({ take: BEST_OF_WEEK.candidates, orderBy: { damageDealt: 'desc' } });
    expect(query?.where?.playedAt).toEqual({ gte: new Date('2026-09-14T00:00:00+03:00'), lt: new Date('2026-09-21T00:00:00+03:00') });
    expect(prisma.replay.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['a', 'b'] } }, data: { isFeatured: true } }));
  });

  it('features only replays their recorder uploaded, so a crafted replay cannot be credited to someone else', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.replay.findMany.mockResolvedValue([
      { ...recordedBy({ id: 'forged', accountId: 1n }), uploader: { lestaAccounts: [{ accountId: 99n }] } },
      recordedBy({ id: 'own', accountId: 2n })
    ]);

    prisma.replay.updateMany.mockResolvedValue({ count: 1 });

    await new BestOfWeekService(prisma).feature(now);

    expect(prisma.replay.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['own'] } } }));
  });

  it('returns 0 without writing when the week had no replays', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.replay.findMany.mockResolvedValue([]);

    expect(await new BestOfWeekService(prisma).feature(now)).toBe(0);
    expect(prisma.replay.updateMany).not.toHaveBeenCalled();
  });
});
