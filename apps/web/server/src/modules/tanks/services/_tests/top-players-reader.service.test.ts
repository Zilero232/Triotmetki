import type { TopPlayersQuery } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountTankRating, Clan } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { TopPlayersReaderService } from '../top-players-reader.service';

const rating = ({ accountId, clanId, ...fields }: Partial<AccountTankRating> & { accountId: bigint; clanId: bigint | null }) =>
  Object.assign(mock<AccountTankRating>({ accountId, battles: 300, winRate: 55, avgDamage: 3_000, wn8: 2_500, ...fields }), {
    player: { nickname: `player${accountId}`, clanId }
  });

const clan = (clanId: bigint, tag: string) => mock<Clan>({ clanId, tag });

const query: TopPlayersQuery = { period: 'overall', metric: 'wn8', limit: 10, minBattles: 100 };

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.accountTankRating.findMany.mockResolvedValue([]);
  prisma.clan.findMany.mockResolvedValue([]);

  return { service: new TopPlayersReaderService(prisma), prisma };
};

describe('TopPlayersReaderService.top', () => {
  it('numbers the players in the order the ranking returns them', async () => {
    const { service, prisma } = createService();

    prisma.accountTankRating.findMany.mockResolvedValue([rating({ accountId: 2n, clanId: null }), rating({ accountId: 1n, clanId: null })]);

    const { entries } = await service.top({ tankId: 1, query });

    expect(entries.map((entry) => [entry.rank, entry.accountId])).toEqual([
      [1, 2],
      [2, 1]
    ]);
  });

  it('shows a missing WN8 as zero', async () => {
    const { service, prisma } = createService();

    prisma.accountTankRating.findMany.mockResolvedValue([rating({ accountId: 1n, clanId: null, wn8: null })]);

    expect((await service.top({ tankId: 1, query })).entries[0]?.value).toBe(0);
  });

  it('resolves clan tags and leaves players without a known clan untagged', async () => {
    const { service, prisma } = createService();

    prisma.accountTankRating.findMany.mockResolvedValue([
      rating({ accountId: 1n, clanId: 10n }),
      rating({ accountId: 2n, clanId: null }),
      rating({ accountId: 3n, clanId: 99n })
    ]);

    prisma.clan.findMany.mockResolvedValue([clan(10n, 'ABC')]);

    const { entries } = await service.top({ tankId: 1, query });

    expect(entries.map((entry) => entry.clanTag)).toEqual(['ABC', null, null]);
  });

  it('reports the value of the requested metric', async () => {
    const { service, prisma } = createService();

    prisma.accountTankRating.findMany.mockResolvedValue([rating({ accountId: 1n, clanId: null, avgDamage: 3_210, winRate: 61 })]);

    const damage = await service.top({ tankId: 1, query: { ...query, metric: 'avgDamage' } });
    const winRate = await service.top({ tankId: 1, query: { ...query, metric: 'winRate' } });

    expect(damage.entries[0]?.value).toBe(3_210);
    expect(winRate.entries[0]?.value).toBe(61);
  });

  it('grades WN8 and win rate but not average damage', async () => {
    const { service, prisma } = createService();

    prisma.accountTankRating.findMany.mockResolvedValue([rating({ accountId: 1n, clanId: null })]);

    expect((await service.top({ tankId: 1, query })).entries[0]?.tier).not.toBeNull();
    expect((await service.top({ tankId: 1, query: { ...query, metric: 'winRate' } })).entries[0]?.tier).not.toBeNull();
    expect((await service.top({ tankId: 1, query: { ...query, metric: 'avgDamage' } })).entries[0]?.tier).toBeNull();
  });

  it('echoes the tank, period and metric with no entries for an unplayed tank', async () => {
    const { service } = createService();

    await expect(service.top({ tankId: 1, query })).resolves.toEqual({ tankId: 1, period: 'overall', metric: 'wn8', entries: [] });
  });
});
