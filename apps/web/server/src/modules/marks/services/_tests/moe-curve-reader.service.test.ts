import type { MoeCurvePoint } from '@otmetki/schemas';

import { MOE_CURVE } from '@otmetki/schemas';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ThresholdsReaderService } from '../../../reference';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { MoeCurveReaderService } from '../moe-curve-reader.service';

const createService = (rows: MoeCurvePoint[]) => {
  const thresholds = mock<ThresholdsReaderService>();
  const queries = { moeCurve: vi.fn().mockResolvedValue(rows) };

  thresholds.moe.mockResolvedValue(null);

  return new MoeCurveReaderService(mockPrismaService(), thresholds, queries);
};

describe('MoeCurveReaderService.curve', () => {
  it('answers no points and no thresholds for a tank nobody reported', async () => {
    const service = createService([]);

    await expect(service.curve(1)).resolves.toMatchObject({ tankId: 1, thresholds: null, points: [], minPlayers: MOE_CURVE.minPlayers });
  });

  it('keeps only the percents enough players reported', async () => {
    const service = createService([
      { percent: 70, damage: 2_400, players: MOE_CURVE.minPlayers, battles: 90 },
      { percent: 75, damage: 2_500, players: 1, battles: 3 }
    ]);

    expect((await service.curve(1)).points.map(({ percent }) => percent)).toEqual([70]);
  });
});
