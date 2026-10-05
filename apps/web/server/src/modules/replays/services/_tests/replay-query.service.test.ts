import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player, Replay } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { ObjectStorage, PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { ReplaySearchQuery } from '../../replays.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { BEST_OF_WEEK } from '../../config';
import { ReplayQueryService } from '../replay-query.service';

const replayRow = (overrides: Partial<Replay>): Replay => ({
  id: 'r1',
  uploaderUserId: 'owner',
  deviceId: null,
  storageKey: 'replays/r1.mtreplay',
  timelineKey: null,
  fileName: 'battle.mtreplay',
  fileSize: 1,
  sha256: 'sha',
  status: 'parsed',
  parseError: null,
  visibility: 'public',
  hiddenAt: null,
  gameVersion: null,
  arenaUniqueId: null,
  arenaId: null,
  battleType: null,
  gameplayMode: null,
  mapName: null,
  vehicleType: null,
  battleId: null,
  accountId: null,
  tankId: null,
  result: null,
  damageDealt: 3000,
  damageAssisted: null,
  frags: null,
  xp: null,
  medals: [],
  summary: null,
  clanTag: null,
  damageBlocked: null,
  markOfMastery: null,
  tags: [],
  tagsVersion: 0,
  playerAccountIds: [],
  hasTracks: false,
  heatmapAppliedAt: null,
  isFeatured: false,
  views: 4,
  playedAt: null,
  parsedAt: null,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides
});

const searchQuery: ReplaySearchQuery = { limit: 20, offset: 0, sort: 'recent' };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const storage = mock<ObjectStorage>();
  const config = mock<AppConfigService>();

  const catalog = mock<VehicleCatalogService>();

  config.get.mockReturnValue('http://localhost:4000');

  return { service: new ReplayQueryService(prisma, storage, config, catalog), prisma, storage, catalog };
};

describe('ReplayQueryService.get', () => {
  it('hides a private replay from anyone but its uploader', async () => {
    const { service, prisma } = createService();

    prisma.replay.findUnique.mockResolvedValue(replayRow({ visibility: 'private' }));

    await expect(service.get({ id: 'r1', viewerUserId: 'stranger' })).rejects.toBeInstanceOf(AppNotFoundException);
    await expect(service.get({ id: 'r1', viewerUserId: null })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.replay.updateMany).not.toHaveBeenCalled();
  });

  it('shows a private replay to its uploader and counts the view', async () => {
    const { service, prisma } = createService();
    const replay = replayRow({ visibility: 'private' });

    prisma.replay.findUnique.mockResolvedValue(replay);

    const view = await service.get({ id: 'r1', viewerUserId: 'owner' });

    expect(view.views).toBe(replay.views + 1);
    expect(view.downloadUrl).toMatch(/^http:\/\/localhost:4000\//);
  });

  it('does not count views while the replay is still being parsed', async () => {
    const { service, prisma } = createService();
    const replay = replayRow({ status: 'parsing' });

    prisma.replay.findUnique.mockResolvedValue(replay);

    const view = await service.get({ id: 'r1', viewerUserId: 'owner' });

    expect(view.views).toBe(replay.views);
    expect(prisma.replay.updateMany).not.toHaveBeenCalled();
  });
});

describe('ReplayQueryService.search', () => {
  it('returns an empty page for an unknown player without querying replays', async () => {
    const { service, prisma } = createService();

    prisma.player.findFirst.mockResolvedValue(null);

    const page = await service.search({ ...searchQuery, player: 'Nobody', offset: 40 });

    expect(page).toEqual({ items: [], total: 0, limit: searchQuery.limit, offset: 40 });
    expect(prisma.replay.findMany).not.toHaveBeenCalled();
    expect(prisma.replay.count).not.toHaveBeenCalled();
  });

  it('searches by the account id even when the nickname is unknown', async () => {
    const { service, prisma } = createService();

    prisma.player.findFirst.mockResolvedValue(null);
    prisma.replay.findMany.mockResolvedValue([]);
    prisma.replay.count.mockResolvedValue(0);

    await service.search({ ...searchQuery, player: 'Renamed', accountId: 9 });

    expect(prisma.player.findFirst).not.toHaveBeenCalled();
    expect(prisma.replay.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ playerAccountIds: { has: 9n } });
  });

  it('filters by the participant account of a known player', async () => {
    const { service, prisma } = createService();

    prisma.player.findFirst.mockResolvedValue(mock<Player>({ accountId: 7n }));
    prisma.replay.findMany.mockResolvedValue([replayRow({})]);
    prisma.replay.count.mockResolvedValue(1);

    const page = await service.search({ ...searchQuery, player: 'Known' });

    expect(page.total).toBe(1);
    expect(prisma.replay.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ playerAccountIds: { has: 7n } });
  });
});

describe('ReplayQueryService.bestOfWeek', () => {
  it('serves the featured replays when the week has them', async () => {
    const { service, prisma } = createService();

    prisma.replay.findMany.mockResolvedValueOnce([replayRow({ id: 'featured', isFeatured: true })]);

    const best = await service.bestOfWeek('2026-09-14');

    expect(best.items.map((item) => item.id)).toEqual(['featured']);
    expect(prisma.replay.findMany).toHaveBeenCalledTimes(1);
  });

  it('falls back to the computed top by damage when nothing is featured', async () => {
    const { service, prisma } = createService();

    prisma.replay.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([replayRow({ id: 'top' })]);

    const best = await service.bestOfWeek('2026-09-14');
    const fallback = prisma.replay.findMany.mock.calls[1]?.[0];

    expect(best.items.map((item) => item.id)).toEqual(['top']);
    expect(best.weekStart).toBe('2026-09-14');
    expect(fallback).toMatchObject({ where: { damageDealt: { not: null } }, orderBy: { damageDealt: 'desc' }, take: BEST_OF_WEEK.size });
    expect(fallback?.where).not.toHaveProperty('isFeatured');
  });
});
