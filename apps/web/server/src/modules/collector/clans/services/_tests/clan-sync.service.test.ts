import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Clan, ClanMember } from '../../../../../../generated';
import type { LestaClients, WebhookEmitter } from '../../../../../core';
import type { ClanInfo } from '../../../../../lib/lesta';
import type { ClansQueries } from '../../providers/clans-queries.types';
import type { ClanActivityRow } from '../../queries/clan-activity.types';

import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { PurgeGuardService } from '../../../purge';
import { CLANS } from '../../config/clans.constants';
import { clansQueries } from '../../providers/clans-queries.provider';
import { ClanSnapshotSyncService } from '../clan-snapshot-sync.service';
import { ClanSyncService } from '../clan-sync.service';

const CLAN_ID = 500;

const member = (accountId: number, role = 'private') => ({ account_id: accountId, account_name: `p${accountId}`, joined_at: 1_600_000_000, role });

const clanInfo = (fields: Partial<ClanInfo> = {}): ClanInfo => ({
  clan_id: CLAN_ID,
  name: 'Clan',
  tag: 'CLN',
  created_at: 1_500_000_000,
  members_count: 2,
  members: [member(1), member(2)],
  ...fields
});

const storedMember = (accountId: number, role: ClanMember['role'] = 'private') => mock<ClanMember>({ accountId: BigInt(accountId), role });

type Setup = {
  info: ClanInfo | null;
  exists: boolean;
  stored?: ClanMember[];
  blocked?: number[];
  activity?: ClanActivityRow[];
};

const createSync = ({ info, exists, stored = [], blocked = [], activity = [] }: Setup) => {
  const prisma = mockPrismaService();
  const queries: ClansQueries = { ...clansQueries, clanActivity: async () => activity };
  const guard = mock<PurgeGuardService>();
  const clients = mockDeep<LestaClients>();
  const webhooks = mock<WebhookEmitter>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.clan.findUnique.mockResolvedValue(exists ? mock<Clan>({ clanId: BigInt(CLAN_ID) }) : null);
  prisma.clanMember.findMany.mockResolvedValue(stored);
  guard.blocked.mockResolvedValue(new Set(blocked));
  clients.bulk.clans.info.mockResolvedValue({ [String(CLAN_ID)]: info });
  clients.bulk.globalmap.claninfo.mockResolvedValue({});
  clients.bulk.stronghold.claninfo.mockResolvedValue({});
  clients.bulk.globalmap.clanprovinces.mockResolvedValue({});

  const snapshots = new ClanSnapshotSyncService(prisma, clients, queries);

  return { prisma, clients, webhooks, sync: new ClanSyncService(prisma, guard, clients, webhooks, snapshots) };
};

describe('ClanSyncService.refresh', () => {
  it('ignores a clan that Lesta does not know and we never stored', async () => {
    const { prisma, webhooks, sync } = createSync({ info: null, exists: false });

    expect(await sync.refresh({ clanIds: [CLAN_ID], snapshot: false })).toEqual({ clans: 1, events: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('stores a first-seen clan and its members without inventing join events', async () => {
    const { prisma, webhooks, sync } = createSync({ info: clanInfo(), exists: false });

    const result = await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(result.events).toBe(0);

    expect(prisma.player.createMany.mock.calls[0]?.[0]?.data).toEqual([
      expect.objectContaining({ accountId: 1n, nickname: 'p1', trackingTier: 'population' }),
      expect.objectContaining({ accountId: 2n, nickname: 'p2', trackingTier: 'population' })
    ]);

    expect(prisma.clanMemberEvent.createMany.mock.calls[0]?.[0]?.data).toEqual([]);
    expect(webhooks.emit).not.toHaveBeenCalled();
  });

  it('records joins and departures of a known clan and announces them', async () => {
    const { prisma, webhooks, sync } = createSync({
      info: clanInfo({ members: [member(1), member(3)] }),
      exists: true,
      stored: [storedMember(1), storedMember(2)]
    });

    const result = await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(result.events).toBe(2);
    expect(prisma.clanMember.deleteMany.mock.calls[0]?.[0]?.where).toMatchObject({ accountId: { in: [2n] } });

    expect(webhooks.emit).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'clan.member_changed', subject: { accountIds: [3, 2], clanIds: [CLAN_ID] } })
    );
  });

  it('moves the clan of joined players at once and clears it for players who left', async () => {
    const { prisma, sync } = createSync({
      info: clanInfo({ members: [member(1), member(3)] }),
      exists: true,
      stored: [storedMember(1), storedMember(2)]
    });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(prisma.player.updateMany.mock.calls.map(([args]) => args)).toEqual([
      { where: { accountId: { in: [3n] } }, data: { clanId: BigInt(CLAN_ID) } },
      { where: { accountId: { in: [2n] }, clanId: BigInt(CLAN_ID) }, data: { clanId: null } }
    ]);
  });

  it('updates the stored role of a promoted member', async () => {
    const { prisma, sync } = createSync({
      info: clanInfo({ members: [member(1, 'commander')] }),
      exists: true,
      stored: [storedMember(1, 'private')]
    });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(prisma.clanMember.upsert.mock.calls[0]?.[0]).toMatchObject({ where: { accountId: 1n }, update: { role: 'commander' } });
  });

  it('files a member with an unknown Lesta role under the default role', async () => {
    const { prisma, sync } = createSync({ info: clanInfo({ members: [member(1, 'space_admiral')] }), exists: false });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(prisma.clanMember.upsert.mock.calls[0]?.[0].create).toMatchObject({ role: CLANS.defaultRole });
  });

  it('never stores a purged member', async () => {
    const { prisma, sync } = createSync({ info: clanInfo(), exists: false, blocked: [2] });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(prisma.player.createMany.mock.calls[0]?.[0]?.data).toEqual([expect.objectContaining({ accountId: 1n })]);
    expect(prisma.clan.upsert.mock.calls[0]?.[0].update).toMatchObject({ membersCount: 1 });
  });

  it.each([
    ['disbanded', clanInfo({ is_clan_disbanded: true })],
    ['gone from Lesta', null]
  ])('empties the roster of a known clan that is %s', async (_, info) => {
    const { prisma, sync } = createSync({ info, exists: true, stored: [storedMember(1)] });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(prisma.clan.upsert.mock.calls[0]?.[0].update).toMatchObject({ isDisbanded: true, membersCount: 0 });
    expect(prisma.clanMember.deleteMany.mock.calls[0]?.[0]?.where).toMatchObject({ accountId: { in: [1n] } });
  });

  it('writes no snapshot unless asked', async () => {
    const { prisma, clients, sync } = createSync({ info: clanInfo(), exists: true });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: false });

    expect(clients.bulk.globalmap.claninfo).not.toHaveBeenCalled();
    expect(prisma.clanSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('snapshots only clans Lesta still returns', async () => {
    const { prisma, clients, sync } = createSync({ info: null, exists: false });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(clients.bulk.globalmap.claninfo).not.toHaveBeenCalled();
    expect(prisma.clanSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('reads elo ratings and the stronghold level into the snapshot', async () => {
    const { prisma, clients, sync } = createSync({ info: clanInfo(), exists: true });
    const [levelKey = ''] = CLANS.strongholdLevelKeys;

    clients.bulk.globalmap.claninfo.mockResolvedValue({ [String(CLAN_ID)]: { ratings: { [CLANS.eloKeys.eloRating10]: 1200 } } });
    clients.bulk.stronghold.claninfo.mockResolvedValue({ [String(CLAN_ID)]: { [levelKey]: 7 } });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.clanSnapshot.upsert.mock.calls[0]?.[0].create).toMatchObject({
      eloRating10: 1200,
      eloRating6: null,
      membersCount: clanInfo().members_count
    });

    expect(prisma.clan.update.mock.calls[0]?.[0]).toMatchObject({
      where: { clanId: BigInt(CLAN_ID) },
      data: { strongholdLevel: 7, stronghold: { stats: { [levelKey]: 7 } } }
    });
  });

  it('still snapshots the clan when the global map and stronghold requests fail', async () => {
    const { prisma, clients, sync } = createSync({ info: clanInfo(), exists: true });

    clients.bulk.globalmap.claninfo.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));
    clients.bulk.stronghold.claninfo.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));
    clients.bulk.globalmap.clanprovinces.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.clanSnapshot.upsert.mock.calls[0]?.[0].create).toMatchObject({ eloRating6: null, eloRating8: null, eloRating10: null });
    expect(prisma.clan.update).not.toHaveBeenCalled();
    expect(prisma.globalMapProvince.deleteMany).not.toHaveBeenCalled();
  });

  it('writes the battles and averages of the members into the snapshot', async () => {
    const { prisma, sync } = createSync({
      info: clanInfo(),
      exists: true,
      activity: [{ clanId: CLAN_ID, battlesDelta: 42, avgWn8: 1500, avgWinRate: 52.5, activeMembers7d: 2 }]
    });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.clanSnapshot.upsert.mock.calls[0]?.[0].create).toMatchObject({
      battlesDelta: 42,
      avgWn8: 1500,
      avgWinRate: 52.5,
      activeMembers7d: 2
    });
  });

  it('leaves the member figures empty for a clan without member activity', async () => {
    const { prisma, sync } = createSync({ info: clanInfo(), exists: true });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.clanSnapshot.upsert.mock.calls[0]?.[0].create).toMatchObject({ battlesDelta: null, avgWn8: null, activeMembers7d: null });
  });

  it('replaces the provinces the clan owns', async () => {
    const { prisma, clients, sync } = createSync({ info: clanInfo(), exists: true });

    clients.bulk.globalmap.clanprovinces.mockResolvedValue({
      [String(CLAN_ID)]: [{ province_id: 'TA_12', province_name: 'Province', front_id: 'front', prime_time: '19:00', daily_revenue: 300 }]
    });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.globalMapProvince.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerClanId: BigInt(CLAN_ID), provinceId: { notIn: ['TA_12'] } } })
    );

    expect(prisma.globalMapProvince.upsert.mock.calls[0]?.[0]).toMatchObject({
      where: { provinceId: 'TA_12' },
      create: { provinceId: 'TA_12', frontId: 'front', name: 'Province', primeTime: '19:00', dailyRevenue: 300, ownerClanId: BigInt(CLAN_ID) }
    });
  });

  it('clears the provinces of a clan that lost them all', async () => {
    const { prisma, clients, sync } = createSync({ info: clanInfo(), exists: true });

    clients.bulk.globalmap.clanprovinces.mockResolvedValue({ [String(CLAN_ID)]: null });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.globalMapProvince.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerClanId: BigInt(CLAN_ID), provinceId: { notIn: [] } } })
    );

    expect(prisma.globalMapProvince.upsert).not.toHaveBeenCalled();
  });

  it('keeps the stored provinces when the payload is malformed', async () => {
    const { prisma, clients, sync } = createSync({ info: clanInfo(), exists: true });

    clients.bulk.globalmap.clanprovinces.mockResolvedValue({ [String(CLAN_ID)]: { province_id: 'TA_12' } });

    await sync.refresh({ clanIds: [CLAN_ID], snapshot: true });

    expect(prisma.globalMapProvince.deleteMany).not.toHaveBeenCalled();
  });
});
