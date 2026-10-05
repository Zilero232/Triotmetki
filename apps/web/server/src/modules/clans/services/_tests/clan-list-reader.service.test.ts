import { describe, expect, it, vi } from 'vitest';

import type { ClanListQueries, ClanListRow } from '../../queries/clan-list.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { ClanListReaderService } from '../clan-list-reader.service';

const row: ClanListRow = {
  clanId: 10,
  tag: 'BRNVK',
  name: 'Три отметки',
  color: '#ff0000',
  motto: null,
  emblems: null,
  membersCount: 80,
  createdAt: null,
  isDisbanded: false,
  avgWn8: 1_800,
  avgWinRate: 55.5,
  activeMembers7d: 40,
  eloRating10: 1_200,
  strongholdLevel: 10,
  total: 3
};

const createService = (rows: ClanListRow[]) => {
  const queries: ClanListQueries = { clanListPage: vi.fn().mockResolvedValue(rows) };

  return new ClanListReaderService(mockPrismaService(), queries);
};

describe('ClanListReaderService.list', () => {
  it('reports the total of the whole result', async () => {
    const page = await createService([row]).list({ limit: 1, offset: 0, order: 'desc', search: 'брон' });

    expect(page.total).toBe(3);
  });

  it('maps the clan of a row', async () => {
    const page = await createService([row]).list({ limit: 1, offset: 0, order: 'desc' });

    expect(page.items[0]?.clan).toMatchObject({ clanId: 10, tag: 'BRNVK', color: '#ff0000' });
  });

  it('rates the average WN8 of a row', async () => {
    const page = await createService([row]).list({ limit: 1, offset: 0, order: 'desc' });

    expect(page.items[0]?.avgWn8.tier).not.toBeNull();
  });

  it('answers an empty page with a zero total', async () => {
    expect(await createService([]).list({ limit: 25, offset: 0, order: 'desc' })).toEqual({ items: [], total: 0, limit: 25, offset: 0 });
  });
});
