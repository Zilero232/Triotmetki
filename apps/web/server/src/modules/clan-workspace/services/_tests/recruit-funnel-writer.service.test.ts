import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Player, RecruitCandidate } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ClanAccessService } from '../clan-access.service';

import { Prisma } from '../../../../../generated';
import { AppConflictException } from '../../../../common/exceptions';
import { RecruitFunnelWriterService } from '../recruit-funnel-writer.service';

const clanId = 100;
const scope = { clanId, userId: 'u1' };
const at = new Date('2026-09-01T00:00:00Z');

const rating: AccountRating = {
  accountId: 7n,
  period: 'overall',
  battles: 12_000,
  winRate: 0.54,
  avgDamage: 1_900,
  avgFrags: 1.1,
  avgTier: 8.4,
  wn8: 2_100,
  eff: null,
  broneIndex: null,
  fromCapturedAt: null,
  toCapturedAt: null,
  computedAt: at
};

const candidate: RecruitCandidate = {
  id: 'c1',
  clanId: BigInt(clanId),
  accountId: 7n,
  status: 'sourced',
  notes: 'good tanker',
  statsSnapshot: null,
  createdByUserId: 'u1',
  createdAt: at,
  updatedAt: at
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const access = mock<ClanAccessService>();

  access.officer.mockResolvedValue({ accountId: 1n, role: 'commander', isOfficer: true });
  prisma.player.findUnique.mockResolvedValue(mock<Player>({ nickname: 'Tanker' }));
  prisma.accountRating.findUnique.mockResolvedValue(rating);
  prisma.recruitCandidate.create.mockResolvedValue(candidate);

  return { service: new RecruitFunnelWriterService(prisma, access), prisma, access };
};

describe('RecruitFunnelWriterService.add', () => {
  it('stores a snapshot of the overall rating with the candidate', async () => {
    const { service, prisma } = createService();

    await service.add({ ...scope, accountId: 7, notes: 'good tanker' });

    expect(prisma.recruitCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clanId: BigInt(clanId),
          accountId: 7n,
          createdByUserId: 'u1',
          statsSnapshot: expect.objectContaining({
            nickname: 'Tanker',
            battles: rating.battles,
            wn8: rating.wn8,
            winRate: rating.winRate,
            avgDamage: rating.avgDamage
          })
        })
      })
    );
  });

  it('stores nulls when the player has no rating yet', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(null);
    prisma.accountRating.findUnique.mockResolvedValue(null);

    await service.add({ ...scope, accountId: 7 });

    expect(prisma.recruitCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: null,
          statsSnapshot: expect.objectContaining({ nickname: null, battles: null, wn8: null, winRate: null, avgDamage: null })
        })
      })
    );
  });

  it('reports a player already in the funnel as a conflict', async () => {
    const { service, prisma } = createService();

    prisma.recruitCandidate.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));

    await expect(service.add({ ...scope, accountId: 7 })).rejects.toBeInstanceOf(AppConflictException);
  });

  it('checks the caller is an officer before touching the funnel', async () => {
    const { service, prisma, access } = createService();

    access.officer.mockRejectedValue(new Error('forbidden'));

    await expect(service.add({ ...scope, accountId: 7 })).rejects.toThrow('forbidden');
    expect(prisma.recruitCandidate.create).not.toHaveBeenCalled();
  });
});
