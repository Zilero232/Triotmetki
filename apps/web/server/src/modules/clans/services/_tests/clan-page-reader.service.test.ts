import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Clan, ClanMember, ClanMemberEvent, ClanSnapshot, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppNotFoundException } from '../../../../common/exceptions';
import { CLAN_PAGE } from '../../config/clan-page.constants';
import { ClanPageReaderService } from '../clan-page-reader.service';

const NOW = new Date('2026-09-26T12:00:00Z');
const CLAN_ID = 10n;

const clan = (fields: Partial<Clan> = {}) =>
  mock<Clan>({
    clanId: CLAN_ID,
    tag: 'BRNVK',
    name: 'Три отметки',
    color: null,
    motto: null,
    emblems: null,
    membersCount: 2,
    createdAt: null,
    isDisbanded: false,
    lastPolledAt: null,
    updatedAt: subDays(NOW, 1),
    strongholdLevel: null,
    ...fields
  });

const rating = (period: AccountRating['period'], wn8: number | null): AccountRating => ({
  accountId: 1n,
  period,
  battles: 1000,
  winRate: 55,
  avgDamage: 2000,
  avgFrags: 1,
  avgTier: 8,
  wn8,
  eff: null,
  broneIndex: null,
  fromCapturedAt: null,
  toCapturedAt: null,
  computedAt: NOW
});

const memberRow = (fields: { accountId: bigint; lastBattleAt: Date | null; ratings: AccountRating[] }) => {
  const member: ClanMember = { accountId: fields.accountId, clanId: CLAN_ID, role: 'executiveOfficer', joinedAt: null, updatedAt: NOW };

  return { ...member, player: { nickname: `p${fields.accountId}`, lastBattleAt: fields.lastBattleAt, ratings: fields.ratings } };
};

const event = (fields: Partial<ClanMemberEvent>): ClanMemberEvent => ({
  id: 'e1',
  clanId: CLAN_ID,
  accountId: 1n,
  type: 'joined',
  oldRole: null,
  newRole: null,
  occurredAt: NOW,
  ...fields
});

const createPage = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.clan.findUnique.mockResolvedValue(clan());
  prisma.clanSnapshot.findFirst.mockResolvedValue(null);
  prisma.clanSnapshot.findMany.mockResolvedValue([]);
  prisma.globalMapProvince.count.mockResolvedValue(0);
  prisma.clanMember.findMany.mockResolvedValue([]);
  prisma.clanMemberEvent.findMany.mockResolvedValue([]);
  prisma.clanMemberEvent.count.mockResolvedValue(0);
  prisma.player.findMany.mockResolvedValue([]);

  return { prisma, service: new ClanPageReaderService(prisma) };
};

describe('ClanPageReaderService.page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws a not-found error for an unknown clan', async () => {
    const { prisma, service } = createPage();

    prisma.clan.findUnique.mockResolvedValue(null);

    await expect(service.page(CLAN_ID)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('reports unknown stats as null rather than zero before the first snapshot', async () => {
    const { service } = createPage();

    const page = await service.page(CLAN_ID);

    expect(page.stats).toMatchObject({
      avgWinRate: null,
      avgBattlesPerDay: null,
      activeMembers7d: null,
      eloRating10: null,
      strongholdLevel: null,
      provincesCount: 0
    });
  });

  it('takes stats from the latest snapshot and the stronghold', async () => {
    const { prisma, service } = createPage();

    prisma.clan.findUnique.mockResolvedValue(clan({ lastPolledAt: NOW, strongholdLevel: 7 }));
    prisma.clanSnapshot.findFirst.mockResolvedValue(mock<ClanSnapshot>({ avgWinRate: 52.5, avgWn8: 1800, activeMembers7d: 0, eloRating10: 1100 }));

    const page = await service.page(CLAN_ID);

    expect(page.stats).toMatchObject({ avgWinRate: 52.5, activeMembers7d: 0, eloRating10: 1100, strongholdLevel: 7 });
    expect(page.updatedAt).toBe(NOW.toISOString());
  });

  it('averages daily battles per member over the recent snapshots', async () => {
    const { prisma, service } = createPage();

    prisma.clanSnapshot.findMany.mockResolvedValue([
      mock<ClanSnapshot>({ battlesDelta: 200, membersCount: 20 }),
      mock<ClanSnapshot>({ battlesDelta: 400, membersCount: 20 })
    ]);

    const page = await service.page(CLAN_ID);

    expect(page.stats.avgBattlesPerDay).toBe(15);

    expect(prisma.clanSnapshot.findMany.mock.calls[0]?.[0]?.where).toEqual({
      clanId: CLAN_ID,
      capturedAt: { gte: subDays(NOW, CLAN_PAGE.battlesPerDayDays) }
    });
  });

  it('falls back to the row update time when the clan was never polled', async () => {
    const { service } = createPage();

    expect((await service.page(CLAN_ID)).updatedAt).toBe(subDays(NOW, 1).toISOString());
  });

  it('asks only for the recent events', async () => {
    const { prisma, service } = createPage();

    await service.page(CLAN_ID);

    expect(prisma.clanMemberEvent.findMany.mock.calls[0]?.[0]).toMatchObject({ take: CLAN_PAGE.recentEvents, skip: 0 });
  });
});

describe('ClanPageReaderService.members', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts whole days since the last battle and leaves never-played members unknown', async () => {
    const { prisma, service } = createPage();

    prisma.clanMember.findMany.mockResolvedValue([
      memberRow({ accountId: 1n, lastBattleAt: subDays(NOW, 3), ratings: [] }),
      memberRow({ accountId: 2n, lastBattleAt: null, ratings: [] })
    ]);

    const [active, silent] = await service.members(CLAN_ID);

    expect(active?.inactiveDays).toBe(3);
    expect(silent?.inactiveDays).toBeNull();
    expect(silent?.lastBattleAt).toBeNull();
  });

  it('never reports negative inactivity for a battle stamped in the future', async () => {
    const { prisma, service } = createPage();

    prisma.clanMember.findMany.mockResolvedValue([memberRow({ accountId: 1n, lastBattleAt: new Date(NOW.getTime() + 86_400_000 * 2), ratings: [] })]);

    const [member] = await service.members(CLAN_ID);

    expect(member?.inactiveDays).toBe(0);
  });

  it('separates the overall rating from the recent one and leaves missing ones empty', async () => {
    const { prisma, service } = createPage();

    prisma.clanMember.findMany.mockResolvedValue([memberRow({ accountId: 1n, lastBattleAt: null, ratings: [rating('overall', 1500)] })]);

    const [member] = await service.members(CLAN_ID);

    expect(member?.wn8.value).toBe(1500);
    expect(member?.recentWn8.value).toBeNull();
    expect(member?.battles).toBe(1000);
    expect(member?.role).toBe('executive_officer');
  });

  it('leaves out members who asked for their data to be hidden', async () => {
    const { prisma, service } = createPage();

    prisma.clanMember.findMany.mockResolvedValue([]);

    await service.members(CLAN_ID);

    expect(prisma.clanMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clanId: CLAN_ID, player: { isHidden: false } } }));
  });

  it('leaves battles unknown for a member without an overall rating', async () => {
    const { prisma, service } = createPage();

    prisma.clanMember.findMany.mockResolvedValue([memberRow({ accountId: 1n, lastBattleAt: null, ratings: [] })]);

    const [member] = await service.members(CLAN_ID);

    expect(member?.battles).toBeNull();
    expect(member?.winRate).toBeNull();
  });
});

describe('ClanPageReaderService.events', () => {
  it('drops the events of a player who asked for their data to be hidden', async () => {
    const { prisma, service } = createPage();

    prisma.clanMemberEvent.findMany.mockResolvedValue([
      event({ id: 'a', accountId: 1n, type: 'left' }),
      event({ id: 'b', accountId: 2n, type: 'left' })
    ]);

    prisma.clanMemberEvent.count.mockResolvedValue(2);

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, nickname: 'hidden', isHidden: true }),
      mock<Player>({ accountId: 2n, nickname: 'tanker', isHidden: false })
    ]);

    const page = await service.events({ clanId: CLAN_ID, limit: 2, offset: 0 });

    expect(page.items.map((item) => item.accountId)).toEqual([2]);
  });

  it('names each event by the player nickname and keeps unknown players anonymous', async () => {
    const { prisma, service } = createPage();

    prisma.clanMemberEvent.findMany.mockResolvedValue([
      event({ id: 'a', accountId: 1n, type: 'roleChanged', oldRole: 'private', newRole: 'commander' }),
      event({ id: 'b', accountId: 2n, type: 'left' })
    ]);

    prisma.clanMemberEvent.count.mockResolvedValue(5);
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n, nickname: 'tanker', isHidden: false })]);

    const page = await service.events({ clanId: CLAN_ID, limit: 2, offset: 0 });

    expect(page).toMatchObject({ total: 5, limit: 2, offset: 0 });

    expect(page.items).toEqual([
      expect.objectContaining({ accountId: 1, nickname: 'tanker', type: 'role_changed', oldRole: 'private', newRole: 'commander' }),
      expect.objectContaining({ accountId: 2, nickname: null, type: 'left', oldRole: null, newRole: null })
    ]);
  });
});
