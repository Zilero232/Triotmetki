import { Injectable } from '@nestjs/common';

import type { Heatmap, HeatmapQueryInput } from '../replays.types';

import { PrismaService } from '../../../core';
import { HEATMAP } from '../config/heatmap.constants';
import { emptyGrid, readHeatmapCells } from '../lib/heatmap/heatmap';

@Injectable()
export class HeatmapReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async get({ arenaId, mode, scope }: HeatmapQueryInput): Promise<Heatmap> {
    const row = await this.prisma.mapHeatmap.findUnique({ where: { arenaId_mode_scope: { arenaId, mode, scope } } });
    const cells = row ? readHeatmapCells(row.data) : null;
    const stored = row && cells ? { row, cells } : null;

    return {
      arenaId,
      mode,
      scope,
      gridSize: stored?.row.gridSize ?? HEATMAP.gridSize,
      samples: stored?.row.samples ?? 0,
      cells: stored?.cells ?? emptyGrid(HEATMAP.gridSize),
      updatedAt: stored?.row.updatedAt.toISOString() ?? null
    };
  }
}
