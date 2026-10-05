import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Clan, ClanRole, ClanWorkspace } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ClanAccessService } from '../clan-access.service';

import { Prisma } from '../../../../../generated';
import { AppConflictException, AppForbiddenException } from '../../../../common/exceptions';
import { WORKSPACE_ROLES } from '../../config/roles.constants';
import { WorkspaceWriterService } from '../workspace-writer.service';

const clanId = 100;
const scope = { clanId, userId: 'u1' };
const at = new Date('2026-09-01T00:00:00Z');
const [owner] = WORKSPACE_ROLES.owners;
const owners = new Set<ClanRole>(WORKSPACE_ROLES.owners);
const findOfficerOnly = () => {
  const found = WORKSPACE_ROLES.officers.find((role) => !owners.has(role));

  if (!found) {
    throw new Error('every officer role is also an owner role');
  }

  return found;
};

const officerOnly = findOfficerOnly();

const clan: Clan = {
  clanId: BigInt(clanId),
  tag: 'BRNV',
  name: 'Three Marks',
  color: null,
  motto: null,
  description: null,
  emblems: null,
  membersCount: 42,
  isDisbanded: false,
  isTracked: true,
  createdAt: at,
  strongholdLevel: null,
  stronghold: null,
  strongholdUpdatedAt: null,
  lastPolledAt: null,
  updatedAt: at
};

const workspace: ClanWorkspace = { clanId: BigInt(clanId), ownerUserId: 'u1', settings: null, createdAt: at, updatedAt: at };

const createService = (role: ClanRole, isOfficer = true) => {
  const prisma = mockDeep<PrismaService>();
  const access = mock<ClanAccessService>();
  const membership = { accountId: 1n, role, isOfficer };

  access.membership.mockResolvedValue(membership);
  access.member.mockResolvedValue(membership);
  access.workspace.mockResolvedValue(workspace);
  access.nicknames.mockResolvedValue(new Map());
  prisma.clan.findUnique.mockResolvedValue(clan);
  prisma.clanEvent.findMany.mockResolvedValue([]);

  return { service: new WorkspaceWriterService(prisma, access), prisma, access };
};

describe('WorkspaceWriterService.create', () => {
  it.each(WORKSPACE_ROLES.owners)('lets the %s open the workspace', async (role) => {
    const { service, prisma } = createService(role);

    vi.mocked(prisma.recruitCandidate.groupBy).mockResolvedValue([]);

    expect((await service.create(scope)).clanTag).toBe(clan.tag);
    expect(prisma.clanWorkspace.create).toHaveBeenCalledWith(expect.objectContaining({ data: { clanId: BigInt(clanId), ownerUserId: 'u1' } }));
  });

  it('refuses an officer who is not an owner', async () => {
    const { service, prisma } = createService(officerOnly);

    await expect(service.create(scope)).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.clanWorkspace.create).not.toHaveBeenCalled();
  });

  it('reports a second workspace for the same clan as a conflict', async () => {
    const { service, prisma } = createService(owner);

    prisma.clanWorkspace.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));

    await expect(service.create(scope)).rejects.toBeInstanceOf(AppConflictException);
  });

  it('rethrows any other database error', async () => {
    const { service, prisma } = createService(owner);
    const failure = new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' });

    prisma.clanWorkspace.create.mockRejectedValue(failure);

    await expect(service.create(scope)).rejects.toBe(failure);
  });
});

describe('WorkspaceWriterService.get', () => {
  it('fills every candidate status missing from the counts with zero', async () => {
    const { service, prisma } = createService(owner);

    Object.assign(prisma.recruitCandidate, { groupBy: vi.fn().mockResolvedValue([{ status: 'trial', _count: { _all: 3 } }]) });

    expect((await service.get(scope)).candidates).toEqual({ sourced: 0, contacted: 0, trial: 3, accepted: 0, rejected: 0 });
  });

  it('never counts candidates for a rank-and-file member', async () => {
    const { service, prisma } = createService('private', false);

    const view = await service.get(scope);

    expect(view.role).toBe('member');
    expect(view.candidates).toEqual({ sourced: 0, contacted: 0, trial: 0, accepted: 0, rejected: 0 });
    expect(prisma.recruitCandidate.groupBy).not.toHaveBeenCalled();
  });
});
