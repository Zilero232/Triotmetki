import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { MapHeatmap, Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ReplayTrack } from '../../lib/replay-tracks/replay-tracks.types';

import { HEATMAP } from '../../config/heatmap.constants';
import { HeatmapWriterService } from '../heatmap-writer.service';

const track: ReplayTrack = {
  vehicleId: 1,
  accountId: 7,
  name: 'Player',
  team: 1,
  tankId: 11265,
  vehicleType: 'germany:G16_PzVIB_Tiger_II',
  points: [
    [0, 0, 0],
    [1, 10, 10]
  ]
};

const input = { replayId: 'replay-1', arenaId: '14_siegfried_line', mode: 'ctf', tracks: [track] };

const cellCount = HEATMAP.gridSize * HEATMAP.gridSize;

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.arena.findUnique.mockResolvedValue(null);
  prisma.vehicle.findMany.mockResolvedValue([mock<Vehicle>({ tankId: 11265, tag: 'G16_PzVIB_Tiger_II', type: 'heavyTank' })]);
  prisma.replay.updateMany.mockResolvedValue({ count: 1 });
  prisma.mapHeatmap.findMany.mockResolvedValue([]);

  return { service: new HeatmapWriterService(prisma), prisma };
};

describe('HeatmapWriterService.apply', () => {
  it('does nothing when another run already claimed the replay', async () => {
    const { service, prisma } = createService();

    prisma.replay.updateMany.mockResolvedValue({ count: 0 });

    const written = await service.apply(input);

    expect(written).toBe(0);
  });

  it('writes the all scope and the vehicle class scope for the overall and the battle mode', async () => {
    const { service, prisma } = createService();

    const written = await service.apply(input);
    const keys = prisma.mapHeatmap.upsert.mock.calls.map(
      ([call]) => `${call.where.arenaId_mode_scope?.mode}:${call.where.arenaId_mode_scope?.scope}`
    );

    expect(written).toBe(4);

    expect(keys.sort()).toEqual(
      [`${HEATMAP.allMode}:${HEATMAP.allScope}`, `${HEATMAP.allMode}:heavyTank`, `ctf:${HEATMAP.allScope}`, 'ctf:heavyTank'].sort()
    );
  });

  it('adds the new samples on top of a stored grid of the same size', async () => {
    const { service, prisma } = createService();
    const stored = mock<MapHeatmap>({
      arenaId: input.arenaId,
      mode: HEATMAP.allMode,
      scope: HEATMAP.allScope,
      gridSize: HEATMAP.gridSize,
      samples: 5,
      data: { cells: Array.from<number>({ length: cellCount }).fill(0) }
    });

    prisma.mapHeatmap.findMany.mockResolvedValue([stored]);

    await service.apply(input);

    const update = prisma.mapHeatmap.upsert.mock.calls.find(
      ([call]) => call.where.arenaId_mode_scope?.mode === HEATMAP.allMode && call.where.arenaId_mode_scope.scope === HEATMAP.allScope
    )?.[0].update;

    expect(update?.samples).toBe(5 + track.points.length);
  });
});
