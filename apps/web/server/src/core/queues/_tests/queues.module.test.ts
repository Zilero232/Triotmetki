import type { Redis } from 'ioredis';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { QueuesModule } from '../queues.module';

describe('QueuesModule.onApplicationShutdown', () => {
  it('closes the Redis connection it handed to BullMQ once the queues and workers are closed', async () => {
    const connection = mock<Redis>();

    connection.quit.mockResolvedValue('OK');

    await new QueuesModule(connection).onApplicationShutdown();

    expect(connection.quit).toHaveBeenCalledOnce();
  });

  it('shuts down quietly when the connection is already gone', async () => {
    const connection = mock<Redis>();

    connection.quit.mockRejectedValue(new Error('Connection is closed.'));

    await expect(new QueuesModule(connection).onApplicationShutdown()).resolves.toBeUndefined();
  });
});
