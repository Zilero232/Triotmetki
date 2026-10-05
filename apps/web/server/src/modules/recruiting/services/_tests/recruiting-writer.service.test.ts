import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ClanMember, RecruitingPost, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CommunityAccountsReaderService } from '../../../community-core';

import { AppBadRequestException, AppForbiddenException } from '../../../../common/exceptions';
import { RECRUITING } from '../../config/recruiting.constants';
import { RecruitingWriterService } from '../recruiting-writer.service';

const clanId = 500;

const row: RecruitingPost = {
  id: '77777777-7777-4777-8777-777777777777',
  kind: 'clanSeeksPlayer',
  clanId: BigInt(clanId),
  accountId: null,
  authorUserId: 'u1',
  title: 'Clan recruits',
  body: 'Looking for active players',
  requirements: {},
  status: 'open',
  expiresAt: new Date('2026-10-09T00:00:00Z'),
  createdAt: new Date('2026-09-25T00:00:00Z'),
  updatedAt: new Date('2026-09-25T00:00:00Z')
};

const request = {
  userId: 'u1',
  title: 'Clan recruits',
  body: 'Looking for active players',
  requirements: {},
  expiresInDays: RECRUITING.defaultDays
};

const member = (role: ClanMember['role'], memberClanId = clanId) => mock<ClanMember>({ clanId: BigInt(memberClanId), role });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const accounts = mock<CommunityAccountsReaderService>();

  accounts.accountOf.mockResolvedValue(7n);
  accounts.statsOf.mockResolvedValue(new Map());
  accounts.nicknamesOf.mockResolvedValue(new Map());
  prisma.clan.findMany.mockResolvedValue([]);
  prisma.recruitingPost.create.mockResolvedValue(row);

  return { service: new RecruitingWriterService(prisma, accounts), prisma, accounts };
};

describe('RecruitingWriterService.create', () => {
  it.each(RECRUITING.officerRoles)('lets a %s post for the clan', async (role) => {
    const { service, prisma } = createService();

    prisma.clanMember.findUnique.mockResolvedValue(member(role));

    await service.create({ ...request, kind: 'clanSeeksPlayer', clanId });

    expect(prisma.recruitingPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clanId: BigInt(clanId), accountId: null }) })
    );
  });

  it('refuses a rank-and-file member', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findUnique.mockResolvedValue(member('private'));

    await expect(service.create({ ...request, kind: 'clanSeeksPlayer', clanId })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.recruitingPost.create).not.toHaveBeenCalled();
  });

  it('refuses an officer of another clan', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findUnique.mockResolvedValue(member('commander', clanId + 1));

    await expect(service.create({ ...request, kind: 'clanSeeksPlayer', clanId })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('refuses a player outside any clan', async () => {
    const { service, prisma } = createService();

    prisma.clanMember.findUnique.mockResolvedValue(null);

    await expect(service.create({ ...request, kind: 'clanSeeksPlayer', clanId })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('needs a clan id for a clan post', async () => {
    const { service } = createService();

    await expect(service.create({ ...request, kind: 'clanSeeksPlayer' })).rejects.toBeInstanceOf(AppBadRequestException);
  });

  it('stores the author account on a player post without a clan', async () => {
    const { service, prisma } = createService();

    prisma.recruitingPost.create.mockResolvedValue({ ...row, kind: 'playerSeeksClan', clanId: null, accountId: 7n });

    const view = await service.create({ ...request, kind: 'playerSeeksClan', clanId });

    expect(prisma.recruitingPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountId: 7n, clanId: null }) })
    );

    expect(prisma.clanMember.findUnique).not.toHaveBeenCalled();
    expect(view.accountId).toBe(7);
  });
});

describe('RecruitingWriterService.expire', () => {
  it('expires open posts past their deadline', async () => {
    const { service, prisma } = createService();
    const now = new Date('2026-09-25T12:00:00Z');

    prisma.recruitingPost.updateMany.mockResolvedValue({ count: 3 });

    expect(await service.expire(now)).toBe(3);

    expect(prisma.recruitingPost.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'open', expiresAt: { lte: now } },
        data: { status: 'expired' }
      })
    );
  });
});

describe('RecruitingWriterService.close', () => {
  it('lets another officer of the clan close the clan post', async () => {
    const { service, prisma } = createService();

    prisma.recruitingPost.findFirst.mockResolvedValue(row);
    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 9n })]);
    prisma.clanMember.findMany.mockResolvedValue([member('executiveOfficer')]);

    await service.close({ id: row.id, userId: 'u2' });

    expect(prisma.recruitingPost.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: row.id, status: 'open' }, data: { status: 'closed' } })
    );
  });

  it('refuses a clan member who is not an officer', async () => {
    const { service, prisma } = createService();

    prisma.recruitingPost.findFirst.mockResolvedValue(row);
    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 9n })]);
    prisma.clanMember.findMany.mockResolvedValue([member('private')]);

    await expect(service.close({ id: row.id, userId: 'u2' })).rejects.toMatchObject({ response: { code: 'NOT_FOUND' } });
    expect(prisma.recruitingPost.updateMany).not.toHaveBeenCalled();
  });
});
