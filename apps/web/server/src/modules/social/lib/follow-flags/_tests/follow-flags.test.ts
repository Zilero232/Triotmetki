import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../../core';

import { FOLLOW_FLAGS } from '../../../config/follow-flags.constants';
import { clearFollowFlag, setFollowFlag } from '../follow-flags';

const key = { userId: 'user', kind: 'player' as const, targetId: 7n };

const createPrisma = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return prisma;
};

describe('setFollowFlag', () => {
  it('creates a favourite without following the target', async () => {
    const prisma = createPrisma();

    await setFollowFlag({ prisma, flag: 'isFavorite', key, data: { label: 'main' } });

    expect(prisma.follow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_kind_targetId: key },
        create: { ...key, isFavorite: true, isFollowing: false, label: 'main' },
        update: { isFavorite: true, label: 'main' }
      })
    );
  });

  it('turns following on without touching the favourite flag of an existing row', async () => {
    const prisma = createPrisma();

    await setFollowFlag({ prisma, flag: 'isFollowing', key });

    expect(prisma.follow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { ...key, isFollowing: true, isFavorite: false }, update: { isFollowing: true } })
    );
  });
});

describe('clearFollowFlag', () => {
  const where = { id: 'f1', userId: 'user' };

  it('deletes the row when the other flag is off', async () => {
    const prisma = createPrisma();

    prisma.follow.deleteMany.mockResolvedValue({ count: 1 });

    expect(await clearFollowFlag({ prisma, flag: 'isFavorite', where })).toBe(true);
    expect(prisma.follow.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ...where, isFavorite: true, isFollowing: false } }));
    expect(prisma.follow.updateMany).not.toHaveBeenCalled();
  });

  it('only clears the flag when the other one keeps the row alive', async () => {
    const prisma = createPrisma();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 1 });

    expect(await clearFollowFlag({ prisma, flag: 'isFollowing', where })).toBe(true);

    expect(prisma.follow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...where, isFollowing: true },
        data: FOLLOW_FLAGS.isFollowing.reset
      })
    );
  });

  it('reports a row that never had the flag', async () => {
    const prisma = createPrisma();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 0 });

    expect(await clearFollowFlag({ prisma, flag: 'isFavorite', where })).toBe(false);
  });
});
