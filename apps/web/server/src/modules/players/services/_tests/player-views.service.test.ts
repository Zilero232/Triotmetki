import { addDays, format } from 'date-fns';
import RedisMock from 'ioredis-mock';
import { countBy } from 'remeda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Clan, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { PLAYER_VIEWS } from '../../config/player-lookup.constants';
import { PlayerViewsService } from '../player-views.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const player = ({ accountId, nickname, clanId = null }: { accountId: bigint; nickname: string; clanId?: bigint | null }): Player => {
  const row = { ...mock<Player>(), accountId, nickname, clanId, ratings: [{ wn8: 1_500 }] };

  return row;
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const redis = new RedisMock();

  prisma.clan.findMany.mockResolvedValue([]);

  return { service: new PlayerViewsService(prisma, redis), prisma, redis };
};

type Harness = ReturnType<typeof createService>;

const recordViews = async ({ service, redis }: Pick<Harness, 'redis' | 'service'>, accountIds: readonly bigint[]) => {
  const key = `${PLAYER_VIEWS.keyPrefix}${format(new Date(), 'yyyy-MM-dd')}`;
  const expected = countBy(accountIds, (id) => id.toString());

  for (const accountId of accountIds) {
    service.record(accountId);
  }

  await vi.waitFor(async () => {
    for (const [member, count] of Object.entries(expected)) {
      expect(Number(await redis.zscore(key, member))).toBe(count);
    }
  });
};

describe('PlayerViewsService.popular', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ranks the most viewed players first with their view counts', async () => {
    const harness = createService();

    await recordViews(harness, [1n, 2n, 2n]);
    harness.prisma.player.findMany.mockResolvedValue([player({ accountId: 1n, nickname: 'One' }), player({ accountId: 2n, nickname: 'Two' })]);

    const popular = await harness.service.popular({ days: 7, limit: 10 });

    expect(popular.items.map(({ nickname, views }) => ({ nickname, views }))).toEqual([
      { nickname: 'Two', views: 2 },
      { nickname: 'One', views: 1 }
    ]);
  });

  it('leaves out players the database no longer shows', async () => {
    const harness = createService();

    await recordViews(harness, [3n, 4n]);
    harness.prisma.player.findMany.mockResolvedValue([player({ accountId: 4n, nickname: 'Visible' })]);

    const popular = await harness.service.popular({ days: 1, limit: 10 });

    expect(popular.items.map((item) => item.accountId)).toEqual([4]);
  });

  it('sums views across the requested days and ignores older days', async () => {
    const harness = createService();

    await recordViews(harness, [5n]);
    vi.setSystemTime(addDays(NOW, 1));
    await recordViews(harness, [5n, 5n]);
    harness.prisma.player.findMany.mockResolvedValue([player({ accountId: 5n, nickname: 'Five' })]);

    expect((await harness.service.popular({ days: 2, limit: 10 })).items[0]?.views).toBe(3);
    expect((await harness.service.popular({ days: 1, limit: 10 })).items[0]?.views).toBe(2);
  });

  it('resolves the clan tag of a player in a clan and null otherwise', async () => {
    const harness = createService();

    await recordViews(harness, [6n, 7n]);

    harness.prisma.player.findMany.mockResolvedValue([
      player({ accountId: 6n, nickname: 'Clanned', clanId: 99n }),
      player({ accountId: 7n, nickname: 'Solo' })
    ]);

    harness.prisma.clan.findMany.mockResolvedValue([{ ...mock<Clan>(), clanId: 99n, tag: 'TAG' }]);

    const popular = await harness.service.popular({ days: 1, limit: 10 });

    expect(Object.fromEntries(popular.items.map((item) => [item.nickname, item.clanTag]))).toEqual({ Clanned: 'TAG', Solo: null });
  });

  it('returns at most the requested number of players', async () => {
    const harness = createService();
    const limit = 2;

    await recordViews(harness, [8n, 9n, 9n, 10n, 10n, 10n]);

    harness.prisma.player.findMany.mockResolvedValue([
      player({ accountId: 8n, nickname: 'Eight' }),
      player({ accountId: 9n, nickname: 'Nine' }),
      player({ accountId: 10n, nickname: 'Ten' })
    ]);

    const popular = await harness.service.popular({ days: 1, limit });

    expect(popular.items.map((item) => item.nickname)).toEqual(['Ten', 'Nine']);
    expect(popular.days).toBe(1);
  });
});
