import type { StreamerCard } from '@otmetki/schemas';

import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { StreamerDirectoryQueryView } from '../../profiles.types';
import type { ProfileCardRow } from '../../selects/profile-card.types';
import type { StreamerCardsService } from '../streamer-cards.service';

import { Prisma } from '../../../../../../generated';
import { STREAMERS } from '../../config/directory.constants';
import { StreamerDirectoryService } from '../streamer-directory.service';

const profile = (slug: string): ProfileCardRow => ({ ...mock<StreamerProfile>({ slug, settings: null }), channels: [] });

const card = (slug: string): StreamerCard => ({
  slug,
  displayName: slug,
  kind: 'claimed',
  channels: [],
  live: null,
  stats: null,
  marks3: null,
  favouriteTanks: [],
  hasSettings: false
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const cards = mock<StreamerCardsService>();

  cards.cards.mockImplementation(async (profiles) => profiles.map((row) => card(row.slug)));

  return { service: new StreamerDirectoryService(prisma, cards, new RedisMock()), prisma, cards };
};

const baseQuery: StreamerDirectoryQueryView = { cursor: 0, limit: 2 };

describe('StreamerDirectoryService.list', () => {
  it('returns a page and points the cursor past it when more streamers follow', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([profile('a'), profile('b'), profile('c')]);

    const page = await service.list({ ...baseQuery, cursor: 4 });

    expect(page.items.map((item) => item.slug)).toEqual(['a', 'b']);
    expect(page.nextCursor).toBe(4 + baseQuery.limit);
    expect(page.editorialEnabled).toBe(STREAMERS.editorialEnabled);
  });

  it('ends the listing on the last page', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([profile('a'), profile('b')]);

    expect((await service.list(baseQuery)).nextCursor).toBeNull();
  });

  it('never lists hidden streamers and turns each filter into a condition', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([]);

    await service.list({ ...baseQuery, live: true, platform: 'twitch', tankId: 7169, hasSettings: false });

    expect(prisma.streamerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hiddenAt: null,
          isLive: true,
          channels: { some: { platform: 'twitch' } },
          liveTankId: 7169,
          settings: { equals: Prisma.DbNull }
        })
      })
    );
  });

  it('leaves out every filter that was not asked for', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([]);

    await service.list(baseQuery);

    const [args] = prisma.streamerProfile.findMany.mock.calls.map(([call]) => call);

    expect(Object.keys(args?.where ?? {}).sort()).toEqual(['hiddenAt', 'kind']);
  });

  it.runIf(!STREAMERS.editorialEnabled)('lists only claimed profiles while editorial profiles are off', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([]);

    await service.list({ ...baseQuery, kind: 'editorial' });

    expect(prisma.streamerProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ kind: 'claimed' }) }));
  });
});

describe('StreamerDirectoryService.live', () => {
  it('builds the live list once and serves repeats from the cache', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([profile('a')]);

    const first = await service.live();
    const second = await service.live();

    expect(second).toEqual(first);
    expect(first.map((item) => item.slug)).toEqual(['a']);
    expect(prisma.streamerProfile.findMany).toHaveBeenCalledTimes(1);
  });

  it('asks only for visible streamers who are live', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([]);

    await service.live();

    expect(prisma.streamerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ hiddenAt: null, isLive: true }) })
    );
  });
});
