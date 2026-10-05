import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { PlayerQueries } from '../../providers/player-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { PLAYTIME } from '../../lib/playtime/playtime.constants';
import { PlayerPlaytimeReaderService } from '../player-playtime-reader.service';

const cell = { weekday: 0, hour: 20, battles: 4, wins: 3, damage: 8_000 };

const createService = ({ battles, snapshots }: { battles: (typeof cell)[]; snapshots: (typeof cell)[] }) => {
  const queries = mock<PlayerQueries>();

  queries.playtimeFromBattles.mockResolvedValue(battles);
  queries.playtimeFromDeltas.mockResolvedValue(snapshots);

  return new PlayerPlaytimeReaderService(mockPrismaService(), queries);
};

describe('PlayerPlaytimeReaderService.playtime', () => {
  it('prefers the exact start times of mod battles', async () => {
    const playtime = await createService({ battles: [cell], snapshots: [] }).playtime(1n);

    expect(playtime.source).toBe('battles');
    expect(playtime.battles).toBe(cell.battles);
  });

  it('falls back to API polls when the mod reported nothing', async () => {
    const playtime = await createService({ battles: [], snapshots: [cell] }).playtime(1n);

    expect(playtime.source).toBe('snapshots');
  });

  it('answers a full empty week when there is no data at all', async () => {
    const playtime = await createService({ battles: [], snapshots: [] }).playtime(1n);

    expect(playtime.source).toBe('none');
    expect(playtime.cells).toHaveLength(PLAYTIME.weekdays * PLAYTIME.hours);
    expect(playtime.cells.every((entry) => entry.battles === 0 && entry.winRate === null)).toBe(true);
  });
});
