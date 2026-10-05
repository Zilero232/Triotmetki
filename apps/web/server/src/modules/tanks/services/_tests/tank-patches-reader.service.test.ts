import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { GameVersion, VehicleSpecHistory } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { SPEC_DIRECTION } from '../../config/patches.constants';
import { TankPatchesReaderService } from '../tank-patches-reader.service';

type HistoryRow = VehicleSpecHistory & { gameVersion: GameVersion };

const [higher = ''] = SPEC_DIRECTION.higher;

const history = ({
  version,
  releasedAt,
  diff = null,
  isTest = false
}: Pick<GameVersion, 'version'> & Partial<Pick<GameVersion, 'isTest' | 'releasedAt'>> & Partial<Pick<VehicleSpecHistory, 'diff'>>) =>
  mock<HistoryRow>({
    diff,
    gameVersion: { version, title: null, releasedAt: releasedAt ?? null, detectedAt: new Date('2026-01-01T00:00:00Z'), isTest }
  });

const createService = (rows: HistoryRow[]) => {
  const prisma = mockDeep<PrismaService>();

  prisma.vehicleSpecHistory.findMany.mockResolvedValue(rows);

  return new TankPatchesReaderService(prisma);
};

describe('TankPatchesReaderService', () => {
  it('lists releases newest first', async () => {
    const service = createService([
      history({ version: '2.0', releasedAt: new Date('2026-06-01T00:00:00Z') }),
      history({ version: '1.0', releasedAt: new Date('2026-03-01T00:00:00Z') }),
      history({ version: '0.9' })
    ]);

    const { patches } = await service.patches(1);

    expect(patches.map((patch) => patch.version)).toEqual(['2.0', '1.0', '0.9']);
  });

  it('skips test builds', async () => {
    const service = createService([history({ version: '1.0' }), history({ version: '1.1-ct', isTest: true })]);

    const { patches } = await service.patches(1);

    expect(patches.map((patch) => patch.version)).toEqual(['1.0']);
  });

  it('marks only the earliest release without a diff as new', async () => {
    const service = createService([
      history({ version: '1.0', releasedAt: new Date('2026-03-01T00:00:00Z') }),
      history({ version: '2.0', releasedAt: new Date('2026-06-01T00:00:00Z') })
    ]);

    const { patches } = await service.patches(1);

    expect(patches.map((patch) => patch.verdict)).toEqual(['changed', 'new']);
  });

  it('judges an earliest release that has a diff by its changes', async () => {
    const service = createService([history({ version: '1.0', diff: [{ path: higher, before: 1, after: 2 }] })]);

    const { patches } = await service.patches(1);

    expect(patches[0]?.verdict).toBe('buff');
    expect(patches[0]?.changes).toHaveLength(1);
  });

  it('returns no patches for a tank without history', async () => {
    await expect(createService([]).patches(1)).resolves.toEqual({ tankId: 1, patches: [] });
  });
});
