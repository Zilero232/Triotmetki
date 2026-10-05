import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { ClanMember, ClanRole, ClanWorkspace, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { WORKSPACE_ROLES } from '../../config/roles.constants';
import { ClanAccessService } from '../clan-access.service';

const clanId = 100;
const scope = { clanId, userId: 'u1' };
const at = new Date('2026-09-01T00:00:00Z');
const [officerRole] = WORKSPACE_ROLES.officers;

const link = (accountId: bigint, userId = 'u1'): UserLestaAccount => ({
  id: `link-${accountId}`,
  userId,
  accountId,
  accessToken: null,
  tokenExpiresAt: null,
  tokenStaleAt: null,
  garageSyncedAt: null,
  isPrimary: false,
  linkedAt: at,
  updatedAt: at
});

const member = (accountId: bigint, role: ClanRole): ClanMember => ({
  accountId,
  clanId: BigInt(clanId),
  role,
  joinedAt: at,
  updatedAt: at
});

const workspace: ClanWorkspace = {
  clanId: BigInt(clanId),
  ownerUserId: 'u1',
  settings: null,
  createdAt: at,
  updatedAt: at
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.userLestaAccount.findMany.mockResolvedValue([link(1n), link(2n)]);
  prisma.clanWorkspace.findUnique.mockResolvedValue(workspace);

  return { service: new ClanAccessService(prisma), prisma };
};

describe('ClanAccessService.membership', () => {
  it('refuses a user whose linked accounts are not in the clan', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([]);

    await expect(service.membership(scope)).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('prefers the officer account among several linked members', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, 'private'), member(2n, officerRole)]);

    expect(await service.membership(scope)).toEqual({ accountId: 2n, role: officerRole, isOfficer: true });
  });

  it('falls back to the first member when nobody is an officer', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, 'private'), member(2n, 'recruit')]);

    expect(await service.membership(scope)).toEqual({ accountId: 1n, role: 'private', isOfficer: false });
  });
});

describe('ClanAccessService.officer', () => {
  it('refuses a rank-and-file member', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, 'private')]);

    await expect(service.officer(scope)).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('refuses an officer of a clan without a workspace', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, officerRole)]);
    prisma.clanWorkspace.findUnique.mockResolvedValue(null);

    await expect(service.officer(scope)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('returns the officer membership when the workspace exists', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, officerRole)]);

    expect((await service.officer(scope)).isOfficer).toBe(true);
  });
});

describe('ClanAccessService.userIdsOf', () => {
  it('keeps only officers when asked for officers', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, officerRole), member(2n, 'private')]);
    prisma.userLestaAccount.findMany.mockResolvedValue([link(1n, 'officer-user')]);

    expect(await service.userIdsOf({ clanId: BigInt(clanId), officersOnly: true })).toEqual(['officer-user']);
    expect(prisma.userLestaAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: { in: [1n] } } }));
  });

  it('returns each user once even with several accounts in the clan', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(1n, officerRole), member(2n, 'private')]);
    prisma.userLestaAccount.findMany.mockResolvedValue([link(1n, 'u1'), link(2n, 'u1')]);

    expect(await service.userIdsOf({ clanId: BigInt(clanId), officersOnly: false })).toEqual(['u1']);
  });

  it('skips the link lookup when no member qualifies', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findMany.mockResolvedValue([member(2n, 'private')]);

    expect(await service.userIdsOf({ clanId: BigInt(clanId), officersOnly: true })).toEqual([]);
    expect(prisma.userLestaAccount.findMany).not.toHaveBeenCalled();
  });
});
