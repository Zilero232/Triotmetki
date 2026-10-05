import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Player } from '../../../../../generated';
import type { AnalyticsQueries } from '../../providers/analytics-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { ExpectedValuesReaderService } from '../../../reference';
import { PLATOON_CHEMISTRY } from '../../config/platoon-chemistry.constants';
import { OwnAccountReaderService } from '../own-account-reader.service';
import { PlatoonChemistryReaderService } from '../platoon-chemistry-reader.service';
import { rawRow } from './analytics.fixtures';

type SizedRow = Awaited<ReturnType<AnalyticsQueries['platoonSplit']>>[number];

type MateRow = Awaited<ReturnType<AnalyticsQueries['platoonMates']>>[number];

const sized = (isPlatoon: boolean, battles: number, wins: number): SizedRow => ({ ...rawRow({ tank_id: 1, battles, wins }), is_platoon: isPlatoon });

const mateRow = (mate: number, battles: number, wins: number): MateRow => ({ ...rawRow({ tank_id: 1, battles, wins }), mate });

const setup = ({ sizedRows, mates }: { sizedRows: SizedRow[]; mates: MateRow[] }) => {
  const prisma = mockPrismaService();
  const queries = mock<AnalyticsQueries>();
  const expected = mock<ExpectedValuesReaderService>();
  const accounts = mock<OwnAccountReaderService>();

  accounts.resolve.mockResolvedValue(7n);
  expected.all.mockResolvedValue(new Map());
  queries.platoonSplit.mockResolvedValue(sizedRows);
  queries.platoonMates.mockResolvedValue(mates);
  prisma.player.findMany.mockResolvedValue([Object.assign(mock<Player>(), { accountId: 11n, nickname: 'Buddy' })]);

  return { prisma, service: new PlatoonChemistryReaderService(prisma, expected, accounts, queries) };
};

describe('PlatoonChemistryReaderService.platoons', () => {
  it('splits solo from platoon battles and tracks their sum', async () => {
    const { service } = setup({ sizedRows: [sized(false, 10, 4), sized(true, 6, 5)], mates: [] });

    const result = await service.platoons({ userId: 'u', period: 'd30' });

    expect(result.solo.battles).toBe(10);
    expect(result.platoon.battles).toBe(6);
    expect(result.tracked).toBe(result.solo.battles + result.platoon.battles);
    expect(result.platoon.winRate).toBeGreaterThan(result.solo.winRate ?? 0);
  });

  it('reports empty lines when no platoon data exists', async () => {
    const { service } = setup({ sizedRows: [], mates: [] });

    const result = await service.platoons({ userId: 'u', period: 'all' });

    expect(result).toMatchObject({ tracked: 0, mates: [], solo: { battles: 0, winRate: null }, platoon: { battles: 0, winRate: null } });
  });

  it('ranks mates by shared battles and compares their win rate to solo play', async () => {
    const { service } = setup({
      sizedRows: [sized(false, 10, 5)],
      mates: [mateRow(11, 4, 4), mateRow(12, 8, 2), mateRow(12, 2, 0)]
    });

    const { mates } = await service.platoons({ userId: 'u', period: 'd30' });

    expect(mates.map((mate) => mate.accountId)).toEqual([12, 11]);
    expect(mates[0]).toMatchObject({ battles: 10, nickname: null });
    expect(mates[0]?.winRateDelta).toBeLessThan(0);
    expect(mates[1]).toMatchObject({ nickname: 'Buddy' });
    expect(mates[1]?.winRateDelta).toBeGreaterThan(0);
  });

  it('caps the mate list', async () => {
    const many = Array.from({ length: PLATOON_CHEMISTRY.maxMates + 3 }, (_, index) => mateRow(100 + index, index + 1, 0));
    const { service } = setup({ sizedRows: [], mates: many });

    const { mates } = await service.platoons({ userId: 'u', period: 'd30' });

    expect(mates).toHaveLength(PLATOON_CHEMISTRY.maxMates);
    expect(mates.every((mate) => mate.battles > 3)).toBe(true);
  });
});
