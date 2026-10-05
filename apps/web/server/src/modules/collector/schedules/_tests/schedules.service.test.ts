import type { ModuleRef } from '@nestjs/core';
import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService, Env } from '../../../../config';

import { SCHEDULES } from '../config/schedules.constants';
import { SchedulesService } from '../schedules.service';

const createService = (env: Pick<Env, 'LESTA_APPLICATION_ID' | 'NODE_ENV'>) => {
  const queue = mock<Queue>();

  queue.getJobSchedulers.mockResolvedValue([]);
  const moduleRef = mock<ModuleRef>();
  const config = mock<AppConfigService>();

  moduleRef.get.mockReturnValue(queue);
  config.get.calledWith('NODE_ENV').mockReturnValue(env.NODE_ENV);
  config.get.calledWith('LESTA_APPLICATION_ID').mockReturnValue(env.LESTA_APPLICATION_ID);

  return { queue, service: new SchedulesService(moduleRef, config) };
};

const registered = (queue: ReturnType<typeof createService>['queue']) => queue.upsertJobScheduler.mock.calls.map(([id]) => id);

describe('SchedulesService', () => {
  it('registers nothing under NODE_ENV=test', async () => {
    const { queue, service } = createService({ NODE_ENV: 'test', LESTA_APPLICATION_ID: 'app' });

    await service.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
    expect(queue.removeJobScheduler).not.toHaveBeenCalled();
  });

  it('registers every enabled schedule and removes the disabled ones', async () => {
    const { queue, service } = createService({ NODE_ENV: 'development', LESTA_APPLICATION_ID: 'app' });

    await service.onApplicationBootstrap();

    expect(registered(queue)).toEqual(SCHEDULES.filter((schedule) => schedule.enabled ?? true).map((schedule) => schedule.id));
    expect(queue.upsertJobScheduler.mock.calls.length + queue.removeJobScheduler.mock.calls.length).toBe(SCHEDULES.length);
  });

  it('drops every Lesta schedule when the worker runs without an application id', async () => {
    const { queue, service } = createService({ NODE_ENV: 'development', LESTA_APPLICATION_ID: '' });

    await service.onApplicationBootstrap();

    const lestaIds = new Set(SCHEDULES.filter((schedule) => schedule.needsLesta).map((schedule) => schedule.id));

    expect(registered(queue).some((id) => lestaIds.has(id))).toBe(false);
    expect(registered(queue).length).toBeGreaterThan(0);
  });
});
