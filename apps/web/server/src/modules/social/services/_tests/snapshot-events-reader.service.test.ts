import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { SnapshotEventsQueries, TankEventRow } from '../../queries/snapshot-events.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { FEED } from '../../config/feed.constants';
import { SnapshotEventsReaderService } from '../snapshot-events-reader.service';

const since = new Date('2026-09-01T00:00:00Z');
const until = new Date('2026-09-08T00:00:00Z');

const event = (fields: Partial<TankEventRow>): TankEventRow => ({
  accountId: 1,
  tankId: 1,
  capturedAt: since,
  marksOnGun: null,
  prevMarks: null,
  markOfMastery: 0,
  prevMastery: null,
  ...fields
});

const createService = () => {
  const queries = mock<SnapshotEventsQueries>();

  return { service: new SnapshotEventsReaderService(mockPrismaService(), queries), queries };
};

describe('SnapshotEventsReaderService.tankEvents', () => {
  it('returns nothing without querying when there are no accounts', async () => {
    const { service, queries } = createService();

    expect(await service.tankEvents({ accountIds: [], since, until })).toEqual([]);
    expect(queries.tankEvents).not.toHaveBeenCalled();
  });
});

describe('SnapshotEventsReaderService.recordEvents', () => {
  it('returns nothing without querying when there are no accounts', async () => {
    const { service, queries } = createService();

    expect(await service.recordEvents({ accountIds: [], since, until })).toEqual([]);
    expect(queries.recordEvents).not.toHaveBeenCalled();
  });
});

describe('SnapshotEventsReaderService.markCounts', () => {
  it('sums every mark increase per account', async () => {
    const { service, queries } = createService();

    queries.tankEvents.mockResolvedValue([
      event({ accountId: 1, tankId: 1, marksOnGun: 2, prevMarks: 1 }),
      event({ accountId: 1, tankId: 2, marksOnGun: 3, prevMarks: 1 }),
      event({ accountId: 2, tankId: 1, marksOnGun: 1, prevMarks: 0 })
    ]);

    expect(await service.markCounts({ accountIds: [1n, 2n], since, until })).toEqual(
      new Map([
        [1n, 3],
        [2n, 1]
      ])
    );
  });

  it('ignores mastery-only rows and marks without a previous value', async () => {
    const { service, queries } = createService();

    queries.tankEvents.mockResolvedValue([
      event({ marksOnGun: 2, prevMarks: 2, markOfMastery: FEED.aceMastery, prevMastery: FEED.aceMastery - 1 }),
      event({ marksOnGun: 1, prevMarks: null })
    ]);

    expect(await service.markCounts({ accountIds: [1n], since, until })).toEqual(new Map());
  });

  it('counts nothing for an empty circle', async () => {
    const { service, queries } = createService();

    expect(await service.markCounts({ accountIds: [], since, until })).toEqual(new Map());
    expect(queries.tankEvents).not.toHaveBeenCalled();
  });
});
