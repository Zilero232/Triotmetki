import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { FakeLestaInput } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures.types';

import { PurgeGuardService } from '../../../purge';
import { accountInfo, accountTank, createFakeLesta, createFakeStore, tankStats } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures';
import { AccountWriterService } from '../account-writer.service';
import { PlayerWriterService } from '../player-writer.service';
import { PollSyncService } from '../poll-sync.service';
import { RatingsTriggerService } from '../ratings-trigger.service';
import { TrackingLestaService } from '../tracking-lesta.service';

const lastBattleTime = 1_790_000_000;

const healthy = (accountId: number) => ({
  info: accountInfo({ accountId, battles: 10, lastBattleTime }),
  tanks: [accountTank({ tankId: 10, battles: 10 })],
  stats: [tankStats({ tankId: 10, battles: 10, accountId })]
});

const lestaFor = (accountIds: readonly number[], failStatsFor: number[] = []): FakeLestaInput => ({
  infos: Object.fromEntries(accountIds.map((id) => [id, healthy(id).info])),
  tanks: Object.fromEntries(accountIds.map((id) => [id, healthy(id).tanks])),
  stats: Object.fromEntries(accountIds.map((id) => [id, healthy(id).stats])),
  failStatsFor
});

const createSync = (input: FakeLestaInput) => {
  const lesta = mock<TrackingLestaService>();
  const ratings = mock<RatingsTriggerService>();
  const { store } = createFakeStore({});

  const players = mock<PlayerWriterService>({
    loadPlayers: store.loadPlayers,
    upsertPlayers: store.upsertPlayers,
    markSynced: store.markSynced,
    markMissing: store.markMissing
  });

  const accounts = mock<AccountWriterService>({ loadBaselines: store.loadBaselines, overallWn8: store.overallWn8 });
  const guard = mock<PurgeGuardService>({ blocked: store.blockedAccounts });

  accounts.withAccount.mockImplementation(store.withAccount);
  lesta.port.mockReturnValue(createFakeLesta(input));

  return { lesta, ratings, sync: new PollSyncService(lesta, players, accounts, guard, ratings) };
};

describe('PollSyncService.run', () => {
  it('polls through the requested Lesta lane', async () => {
    const { lesta, sync } = createSync(lestaFor([1]));

    await sync.run({ accountIds: [1], lane: 'bulk', tier: 'population' });

    expect(lesta.port).toHaveBeenCalledWith('bulk');
  });

  it('asks for rating recalculation of the updated accounts only', async () => {
    const { ratings, sync } = createSync(lestaFor([1, 2], [2]));

    const result = await sync.run({ accountIds: [1, 2], lane: 'priority', tier: 'active' });

    expect(result.failed).toEqual([2]);
    expect(ratings.request).toHaveBeenCalledWith(result.updated);
    expect(result.updated).toEqual([1]);
  });

  it('fails the job when every account in the batch failed so the queue retries it', async () => {
    const { ratings, sync } = createSync(lestaFor([1, 2], [1, 2]));

    await expect(sync.run({ accountIds: [1, 2], lane: 'priority', tier: 'active' })).rejects.toThrow();
    expect(ratings.request).toHaveBeenCalledWith([]);
  });

  it('succeeds when the only accounts are gone from Lesta', async () => {
    const { sync } = createSync({ infos: {}, tanks: {}, stats: {} });

    const result = await sync.run({ accountIds: [5], lane: 'bulk', tier: 'population' });

    expect(result.missing).toEqual([5]);
  });
});
