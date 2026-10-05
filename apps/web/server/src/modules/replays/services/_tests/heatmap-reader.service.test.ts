import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { MapHeatmap } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { HEATMAP } from '../../config/heatmap.constants';
import { emptyGrid } from '../../lib/heatmap/heatmap';
import { HeatmapReaderService } from '../heatmap-reader.service';

const query = { arenaId: '14_siegfried_line', mode: HEATMAP.allMode, scope: HEATMAP.allScope };

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new HeatmapReaderService(prisma), prisma };
};

describe('HeatmapReaderService.get', () => {
  it('returns an empty grid of the configured size when the map has no heatmap yet', async () => {
    const { service, prisma } = createService();

    prisma.mapHeatmap.findUnique.mockResolvedValue(null);

    const heatmap = await service.get(query);

    expect(heatmap.cells).toEqual(emptyGrid(HEATMAP.gridSize));
  });

  it('treats a stored row with unreadable cells as empty', async () => {
    const { service, prisma } = createService();

    prisma.mapHeatmap.findUnique.mockResolvedValue(
      mock<MapHeatmap>({ ...query, gridSize: 8, samples: 40, data: { cells: 'broken' }, updatedAt: new Date() })
    );

    const heatmap = await service.get(query);

    expect(heatmap).toMatchObject({ gridSize: HEATMAP.gridSize, samples: 0, updatedAt: null });
  });

  it('returns the stored cells and sample count', async () => {
    const { service, prisma } = createService();
    const updatedAt = new Date('2026-10-01T10:00:00Z');

    prisma.mapHeatmap.findUnique.mockResolvedValue(mock<MapHeatmap>({ ...query, gridSize: 2, samples: 3, data: { cells: [1, 0, 2, 0] }, updatedAt }));

    const heatmap = await service.get(query);

    expect(heatmap).toMatchObject({ gridSize: 2, samples: 3, cells: [1, 0, 2, 0], updatedAt: updatedAt.toISOString() });
  });
});
