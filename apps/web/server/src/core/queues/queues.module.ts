import type { OnApplicationShutdown } from '@nestjs/common';

import { BullModule } from '@nestjs/bullmq';
import { Global, Inject, Module } from '@nestjs/common';
import { Redis } from 'ioredis';

import { QueueConnectionModule } from './queue-connection.module';
import { QUEUE_CONNECTION, QUEUE_DEFAULTS } from './queues.constants';

@Global()
@Module({
  imports: [
    QueueConnectionModule,
    BullModule.forRootAsync({
      imports: [QueueConnectionModule],
      inject: [QUEUE_CONNECTION],
      useFactory: (connection: Redis) => ({
        prefix: QUEUE_DEFAULTS.prefix,
        connection,
        defaultJobOptions: QUEUE_DEFAULTS.jobOptions
      })
    })
  ]
})
export class QueuesModule implements OnApplicationShutdown {
  constructor(@Inject(QUEUE_CONNECTION) private readonly connection: Redis) {}

  async onApplicationShutdown() {
    await this.connection.quit().catch(() => undefined);
  }
}
