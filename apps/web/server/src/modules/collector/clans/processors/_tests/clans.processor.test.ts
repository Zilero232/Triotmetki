import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { ClanDispatchService } from '../../services/clan-dispatch.service';
import type { ClanHistoryService } from '../../services/clan-history.service';
import type { ClanSyncService } from '../../services/clan-sync.service';

import { JOB } from '../../../contracts';
import { ClansProcessor } from '../clans.processor';

const createProcessor = () => {
  const dispatcher = mock<ClanDispatchService>();
  const sync = mock<ClanSyncService>();
  const history = mock<ClanHistoryService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());

  return { dispatcher, sync, history, processor: new ClansProcessor(dispatcher, sync, history, metrics) };
};

describe('ClansProcessor', () => {
  it('dispatches the requested scope and reports how many clans were queued', async () => {
    const { dispatcher, processor } = createProcessor();

    dispatcher.dispatch.mockResolvedValue(12);

    expect(await processor.process(mock<Job>({ name: JOB.clans.dispatch, data: { scope: 'tracked' } }))).toEqual({ dispatched: 12 });
    expect(dispatcher.dispatch).toHaveBeenCalledWith({ scope: 'tracked' });
  });

  it('routes a history job to the history service', async () => {
    const { history, sync, processor } = createProcessor();

    await processor.process(mock<Job>({ name: JOB.clans.history, data: { accountIds: [1] } }));

    expect(history.history).toHaveBeenCalledWith({ accountIds: [1] });
    expect(sync.refresh).not.toHaveBeenCalled();
  });

  it('refreshes clans without a snapshot unless the payload asks for one', async () => {
    const { sync, processor } = createProcessor();

    await processor.process(mock<Job>({ name: JOB.clans.refresh, data: { clanIds: [5], snapshot: false } }));

    expect(sync.refresh).toHaveBeenCalledWith({ clanIds: [5], snapshot: false });
  });

  it('rejects a refresh with no clan ids', async () => {
    const { sync, processor } = createProcessor();

    await expect(processor.process(mock<Job>({ name: JOB.clans.refresh, data: { clanIds: [], snapshot: false } }))).rejects.toThrow();
    expect(sync.refresh).not.toHaveBeenCalled();
  });
});
