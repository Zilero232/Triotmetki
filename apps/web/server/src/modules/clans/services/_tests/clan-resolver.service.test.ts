import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Clan } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ClanInfo, ClanListItem, LestaClient } from '../../../../lib/lesta';

import { AppNotFoundException } from '../../../../common/exceptions';
import { insensitiveEquals } from '../../../../common/lib';
import { LESTA_ERROR_CODE, LestaApiError } from '../../../../lib/lesta';
import { CollectorProducerService, PurgeGuardService } from '../../../collector';
import { CLAN_PAGE } from '../../config/clan-page.constants';
import { ClanResolverService } from '../clan-resolver.service';

const listed = (clanId: number, tag: string): ClanListItem => ({ clan_id: clanId, tag, name: tag, members_count: 1, created_at: 1_600_000_000 });

const info = (fields: Partial<ClanInfo> = {}): ClanInfo => ({
  clan_id: 42,
  name: 'Clan',
  tag: 'CLN',
  created_at: 1_600_000_000,
  members_count: 2,
  members: [
    { account_id: 1, account_name: 'one', joined_at: 1_600_000_100, role: 'commander' },
    { account_id: 2, account_name: 'two', joined_at: 1_600_000_200, role: 'mystery_role' }
  ],
  ...fields
});

const createResolver = () => {
  const prisma = mockDeep<PrismaService>();
  const collector = mock<CollectorProducerService>();
  const lesta = mockDeep<LestaClient>();
  const purgeGuard = mock<PurgeGuardService>();

  purgeGuard.blocked.mockResolvedValue(new Set());
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.clan.findUnique.mockResolvedValue(null);
  prisma.clan.findFirst.mockResolvedValue(null);
  lesta.clans.list.mockResolvedValue([]);
  lesta.clans.info.mockResolvedValue({});

  return { prisma, collector, lesta, purgeGuard, resolver: new ClanResolverService(prisma, collector, purgeGuard, lesta) };
};

describe('ClanResolverService.resolve', () => {
  it('resolves a stored clan by id without calling Lesta', async () => {
    const { prisma, lesta, resolver } = createResolver();

    prisma.clan.findUnique.mockResolvedValue(mock<Clan>({ clanId: 42n }));

    expect(await resolver.resolve('42')).toBe(42n);
    expect(lesta.clans.info).not.toHaveBeenCalled();
  });

  it('resolves a stored tag case-insensitively', async () => {
    const { prisma, lesta, resolver } = createResolver();

    prisma.clan.findFirst.mockResolvedValue(mock<Clan>({ clanId: 7n }));

    expect(await resolver.resolve('brnvk')).toBe(7n);
    expect(prisma.clan.findFirst.mock.calls[0]?.[0]?.where).toMatchObject({ tag: { equals: 'brnvk', mode: 'insensitive' } });
    expect(lesta.clans.list).not.toHaveBeenCalled();
  });

  it('matches an underscore in a tag literally, not as a LIKE wildcard', async () => {
    const { prisma, resolver } = createResolver();

    prisma.clan.findFirst.mockResolvedValue(mock<Clan>({ clanId: 7n }));

    await resolver.resolve('A_B');

    expect(prisma.clan.findFirst.mock.calls[0]?.[0]?.where).toMatchObject({ tag: insensitiveEquals('A_B') });
  });

  it('answers 404 when Lesta refuses the tag as a search', async () => {
    const { lesta, resolver } = createResolver();

    lesta.clans.list.mockRejectedValue(new LestaApiError({ code: LESTA_ERROR_CODE.invalidSearch, method: 'clans/list', field: 'search' }));

    await expect(resolver.resolve('ТЕГ')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('lets a Lesta outage through instead of answering 404', async () => {
    const { lesta, resolver } = createResolver();

    lesta.clans.list.mockRejectedValue(new LestaApiError({ code: LESTA_ERROR_CODE.sourceNotAvailable, method: 'clans/list' }));

    await expect(resolver.resolve('TAG')).rejects.toBeInstanceOf(LestaApiError);
  });

  it('picks the exact tag from the Lesta search rather than the first fuzzy hit', async () => {
    const { lesta, resolver } = createResolver();

    lesta.clans.list.mockResolvedValue([listed(1, 'CLN-X'), listed(42, 'cln')]);
    lesta.clans.info.mockResolvedValue({ 42: info() });

    expect(await resolver.resolve('CLN')).toBe(42n);
  });

  it('throws not-found when Lesta has no clan with that exact tag', async () => {
    const { lesta, resolver } = createResolver();

    lesta.clans.list.mockResolvedValue([listed(1, 'CLN-X')]);

    await expect(resolver.resolve('CLN')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('throws not-found for an id Lesta does not know', async () => {
    const { lesta, resolver } = createResolver();

    lesta.clans.info.mockResolvedValue({ 42: null });

    await expect(resolver.resolve('42')).rejects.toBeInstanceOf(AppNotFoundException);
  });
});

describe('ClanResolverService.ensure', () => {
  it('stores a new clan with its roster and enrols the members', async () => {
    const { prisma, collector, lesta, resolver } = createResolver();

    lesta.clans.info.mockResolvedValue({ 42: info() });

    expect(await resolver.ensure(42n)).toBe(42n);
    expect(prisma.clan.upsert.mock.calls[0]?.[0].create).toMatchObject({ clanId: 42n, membersCount: 2, isDisbanded: false });
    expect(prisma.player.createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true });
    expect(collector.enrolMany).toHaveBeenCalledWith(expect.objectContaining({ accountIds: [1, 2] }));
  });

  it('files a member with an unknown role as private', async () => {
    const { prisma, lesta, resolver } = createResolver();

    lesta.clans.info.mockResolvedValue({ 42: info() });

    await resolver.ensure(42n);

    expect(prisma.clanMember.createMany.mock.calls[0]?.[0]?.data).toEqual([
      expect.objectContaining({ role: 'commander' }),
      expect.objectContaining({ role: CLAN_PAGE.defaultRole })
    ]);
  });

  it('stores a clan without a member list as empty', async () => {
    const { prisma, collector, lesta, resolver } = createResolver();

    lesta.clans.info.mockResolvedValue({ 42: info({ members: null }) });

    await resolver.ensure(42n);

    expect(prisma.clanMember.createMany).not.toHaveBeenCalled();
    expect(collector.enrolMany).toHaveBeenCalledWith(expect.objectContaining({ accountIds: [] }));
  });
});

describe('ClanResolverService.ensure deletion requests', () => {
  it('never stores or enrols members who asked for their data to be deleted', async () => {
    const { prisma, collector, lesta, purgeGuard, resolver } = createResolver();

    lesta.clans.info.mockResolvedValue({ '42': info() });
    purgeGuard.blocked.mockResolvedValue(new Set([2]));

    await resolver.ensure(42n);

    expect(prisma.player.createMany.mock.calls[0]?.[0]?.data).toEqual([expect.objectContaining({ accountId: 1n })]);
    expect(prisma.clanMember.createMany.mock.calls[0]?.[0]?.data).toEqual([expect.objectContaining({ accountId: 1n })]);
    expect(collector.enrolMany).toHaveBeenCalledWith({ accountIds: [1], priority: 'normal' });
  });
});
