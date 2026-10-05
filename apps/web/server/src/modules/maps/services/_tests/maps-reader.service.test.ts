import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Arena } from '../../../../../generated';
import type { TeamStatsQueries } from '../../queries/team-stats.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { MAP_TEAMS } from '../../config/maps.constants';
import { MapsReaderService } from '../maps-reader.service';

const [team = 0] = MAP_TEAMS.teams;

const arena = mock<Arena>({
  arenaId: '01_karelia',
  slug: 'karelia',
  name: 'Karelia',
  camouflageType: null,
  description: null,
  image: null,
  sizeMeters: null,
  modes: [],
  data: null
});

const createService = () => {
  const prisma = mockPrismaService();
  const queries = { battleSides: vi.fn<TeamStatsQueries['battleSides']>(), replayWinners: vi.fn<TeamStatsQueries['replayWinners']>() };

  prisma.arena.findFirst.mockResolvedValue(arena);
  queries.battleSides.mockResolvedValue([]);
  queries.replayWinners.mockResolvedValue([]);

  return { service: new MapsReaderService(prisma, queries), prisma, queries };
};

describe('MapsReaderService', () => {
  it('searches map names for the typed text literally, wildcards included', async () => {
    const { service, prisma } = createService();

    prisma.arena.findMany.mockResolvedValue([]);

    await service.list({ search: '50%_' });

    expect(prisma.arena.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ name: { contains: '50\\%\\_', mode: 'insensitive' } }) })
    );
  });

  it('answers 404 for an unknown map', async () => {
    const { service, prisma } = createService();

    prisma.arena.findFirst.mockResolvedValue(null);

    await expect(service.detail('nowhere')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('prefers stats from battles', async () => {
    const { service, queries } = createService();

    queries.battleSides.mockResolvedValue([{ team, result: 'win', battles: 1 }]);
    queries.replayWinners.mockResolvedValue([{ winner: team, battles: 5 }]);

    const detail = await service.detail(arena.slug);

    expect(detail.stats).toMatchObject({ source: 'battles', battles: 1 });
  });

  it('falls back to replays when no battles were recorded', async () => {
    const { service, queries } = createService();

    queries.replayWinners.mockResolvedValue([{ winner: team, battles: 2 }]);

    const detail = await service.detail(arena.slug);

    expect(detail.stats).toMatchObject({ source: 'replays', battles: 2 });
  });

  it('reports no stats when neither source has data', async () => {
    const { service } = createService();

    const detail = await service.detail(arena.slug);

    expect(detail.stats).toBeNull();
  });
});
