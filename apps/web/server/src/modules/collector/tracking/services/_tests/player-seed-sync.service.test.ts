import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player } from '../../../../../../generated';
import type { LestaClients, PrismaService } from '../../../../../core';
import type { ClanListItem } from '../../../../../lib/lesta';

import { LESTA_API } from '../../../../../lib/lesta';
import { COLLECTOR_STATE_KEY } from '../../../config';
import { JOB } from '../../../contracts';
import { PurgeGuardService } from '../../../purge';
import { TRACKING } from '../../config/tracking.constants';
import { DispatchService } from '../dispatch.service';
import { PlayerSeedSyncService } from '../player-seed-sync.service';

const clan = (clanId: number): ClanListItem => ({
  clan_id: clanId,
  name: `Clan ${clanId}`,
  tag: `C${clanId}`,
  members_count: 10,
  created_at: 1_600_000_000
});

const createSeed = () => {
  const prisma = mockDeep<PrismaService>();
  const dispatch = mock<DispatchService>();
  const guard = mock<PurgeGuardService>();
  const clients = mockDeep<LestaClients>();
  const clansQueue = mock<Queue>();

  prisma.player.findMany.mockResolvedValue([]);
  guard.blocked.mockResolvedValue(new Set());
  clients.bulk.ratings.top.mockResolvedValue({});
  clients.bulk.clans.list.mockResolvedValue([]);

  return { prisma, dispatch, guard, clients, clansQueue, seed: new PlayerSeedSyncService(prisma, dispatch, guard, clients, clansQueue) };
};

describe('PlayerSeedSyncService.seed', () => {
  it('sweeps only accounts from the ratings that are neither known nor purged', async () => {
    const { prisma, dispatch, guard, clients, seed } = createSeed();

    clients.bulk.ratings.top.mockResolvedValue({ top: [{ account_id: 1 }, { account_id: 2 }, { account_id: 3 }] });
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n })]);
    guard.blocked.mockResolvedValue(new Set([2]));

    const result = await seed.seed();

    expect(dispatch.enqueueSweep).toHaveBeenCalledWith([3]);
    expect(result.accounts).toBe(1);
  });

  it('counts an account found under several rank fields once', async () => {
    const { dispatch, clients, seed } = createSeed();

    clients.bulk.ratings.top.mockResolvedValue({ top: [{ account_id: 7 }] });

    await seed.seed();

    expect(clients.bulk.ratings.top).toHaveBeenCalledTimes(TRACKING.seed.ratingTypes.length * TRACKING.seed.rankFields.length);
    expect(dispatch.enqueueSweep).toHaveBeenCalledWith([7]);
  });

  it('keeps seeding when one ratings request fails', async () => {
    const { dispatch, clients, seed } = createSeed();

    clients.bulk.ratings.top.mockRejectedValueOnce(new Error('SOURCE_NOT_AVAILABLE')).mockResolvedValue({ top: [{ account_id: 5 }] });

    await seed.seed();

    expect(dispatch.enqueueSweep).toHaveBeenCalledWith([5]);
  });

  it('stops paging clans at the first empty page and refreshes them in Lesta-sized batches without snapshots', async () => {
    const { prisma, clients, clansQueue, seed } = createSeed();
    const firstPage = Array.from({ length: LESTA_API.batchSize + 1 }, (_, index) => clan(index + 1));

    clients.bulk.clans.list.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([]);

    const result = await seed.seed();

    expect(clients.bulk.clans.list).toHaveBeenCalledTimes(2);
    expect(prisma.clan.createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true });
    expect(result.clans).toBe(firstPage.length);

    const [jobs = []] = clansQueue.addBulk.mock.calls[0] ?? [];

    expect(jobs.map((job) => job.name)).toEqual([JOB.clans.refresh, JOB.clans.refresh]);
    expect(jobs.flatMap((job) => job.data.clanIds)).toHaveLength(firstPage.length);
    expect(jobs.every((job) => job.data.snapshot === false)).toBe(true);
  });

  it('stores a missing clan colour as null', async () => {
    const { prisma, clients, seed } = createSeed();

    clients.bulk.clans.list.mockResolvedValueOnce([clan(1)]).mockResolvedValueOnce([]);

    await seed.seed();

    expect(prisma.clan.createMany.mock.calls[0]?.[0]?.data).toEqual([expect.objectContaining({ clanId: 1n, color: null })]);
  });

  it('never pages past the configured clan page limit', async () => {
    const { clients, seed } = createSeed();

    clients.bulk.clans.list.mockResolvedValue([clan(1)]);

    await seed.seed();

    expect(clients.bulk.clans.list).toHaveBeenCalledTimes(TRACKING.seed.clanPages);
  });

  it('records the seed result in the collector state', async () => {
    const { prisma, clients, seed } = createSeed();

    clients.bulk.ratings.top.mockResolvedValue({ top: [{ account_id: 9 }] });

    const result = await seed.seed();
    const [upsert] = prisma.collectorState.upsert.mock.calls[0] ?? [];

    expect(upsert?.where).toEqual({ key: COLLECTOR_STATE_KEY.seed });
    expect(upsert?.update.value).toMatchObject(result);
  });
});
