import type { ModuleRef } from '@nestjs/core';
import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService, Env } from '../../../../config';

import { STREAMERS_SCHEDULES } from '../../config/queue.constants';
import { StreamersSchedulesService } from '../streamers-schedules.service';

const createService = (nodeEnv: Env['NODE_ENV']) => {
  const queue = mock<Queue>();

  queue.getJobSchedulers.mockResolvedValue([]);
  const config = mock<AppConfigService>();
  const moduleRef = mock<ModuleRef>();

  config.get.calledWith('NODE_ENV').mockReturnValue(nodeEnv);
  moduleRef.get.mockReturnValue(queue);

  return { queue, service: new StreamersSchedulesService(moduleRef, config) };
};

describe('StreamersSchedulesService', () => {
  it('registers nothing under NODE_ENV=test', async () => {
    const { queue, service } = createService('test');

    await service.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
  });

  it('registers every streamer schedule on its job name', async () => {
    const { queue, service } = createService('production');

    await service.onApplicationBootstrap();

    expect(queue.upsertJobScheduler.mock.calls.map(([id, , template]) => [id, template?.name])).toEqual(
      STREAMERS_SCHEDULES.map((schedule) => [schedule.id, schedule.name])
    );
  });
});
