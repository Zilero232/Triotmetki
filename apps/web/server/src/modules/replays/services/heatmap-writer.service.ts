import { Injectable } from '@nestjs/common';
import { indexBy, unique } from 'remeda';

import type { VehicleType } from '../../../../generated';
import type { ReplayTrack } from '../lib/replay-tracks/replay-tracks.types';
import type { ApplyHeatmapInput } from '../replays.types';

import { toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { HEATMAP } from '../config/heatmap.constants';
import {
  accumulateTracks,
  arenaBounds,
  fallbackBounds,
  gridTotal,
  heatmapKey,
  heatmapScopes,
  mergeGrids,
  readHeatmapCells,
  trackVehicleTag,
  vehicleClassesOf
} from '../lib/heatmap/heatmap';

@Injectable()
export class HeatmapWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async apply({ replayId, arenaId, mode, tracks }: ApplyHeatmapInput): Promise<number> {
    const [arena, classes] = await Promise.all([
      this.prisma.arena.findUnique({ where: { arenaId }, select: { data: true } }),
      this.vehicleClasses(tracks)
    ]);

    const bounds = arenaBounds(arena?.data) ?? fallbackBounds(HEATMAP.fallbackHalfSize);
    const scopes = heatmapScopes({ tracks, classes });
    const modes = unique([HEATMAP.allMode, mode ?? HEATMAP.allMode]);
    let written = 0;

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.replay.updateMany({ where: { id: replayId, heatmapAppliedAt: null }, data: { heatmapAppliedAt: new Date() } });

      if (claimed.count === 0) {
        return;
      }

      const stored = await tx.mapHeatmap.findMany({ where: { arenaId, mode: { in: modes }, scope: { in: [...scopes.keys()] } } });
      const storedOf = indexBy(stored, heatmapKey);

      for (const [scope, scopeTracks] of scopes) {
        const add = accumulateTracks({ tracks: scopeTracks, bounds, gridSize: HEATMAP.gridSize });
        const samples = gridTotal(add);

        for (const heatmapMode of modes) {
          const key = { arenaId, mode: heatmapMode, scope };
          const current = storedOf[heatmapKey(key)];
          const base = current?.gridSize === HEATMAP.gridSize ? readHeatmapCells(current.data) : null;
          const data = toJsonValue({ cells: mergeGrids({ base, add }) });

          await tx.mapHeatmap.upsert({
            where: { arenaId_mode_scope: key },
            create: { ...key, gridSize: HEATMAP.gridSize, samples, data },
            update: { gridSize: HEATMAP.gridSize, samples: (base ? (current?.samples ?? 0) : 0) + samples, data }
          });

          written += 1;
        }
      }
    });

    return written;
  }

  private async vehicleClasses(tracks: readonly ReplayTrack[]): Promise<Map<number, VehicleType>> {
    const tankIds = tracks.flatMap((track) => (track.tankId === null ? [] : [track.tankId]));
    const tags = tracks.flatMap((track) => trackVehicleTag(track.vehicleType) ?? []);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { OR: [{ tankId: { in: tankIds } }, { tag: { in: tags } }] },
      select: { tankId: true, tag: true, type: true }
    });

    return vehicleClassesOf({ tracks, vehicles });
  }
}
