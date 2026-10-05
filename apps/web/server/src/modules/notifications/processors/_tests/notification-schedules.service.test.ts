import type { ModuleRef } from '@nestjs/core';
import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';

import { NOTIFICATION_SCHEDULES } from '../../config/schedules.constants';
import { NotificationSchedulesService } from '../notification-schedules.service';

const createService = (env: 'development' | 'test') => {
  const moduleRef = mock<ModuleRef>();
  const config = mock<AppConfigService>();
  const queue = mock<Queue>();

  queue.getJobSchedulers.mockResolvedValue([]);

  config.get.mockReturnValue(env);
  moduleRef.get.mockReturnValue(queue);

  return { service: new NotificationSchedulesService(moduleRef, config), queue };
};

describe('NotificationSchedulesService.onApplicationBootstrap', () => {
  it('registers no schedulers in tests', async () => {
    const { service, queue } = createService('test');

    await service.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
  });

  it('registers every notification schedule outside tests', async () => {
    const { service, queue } = createService('development');

    await service.onApplicationBootstrap();

    expect(queue.upsertJobScheduler.mock.calls.map((call) => call[0])).toEqual(NOTIFICATION_SCHEDULES.map((schedule) => schedule.id));
  });
});
