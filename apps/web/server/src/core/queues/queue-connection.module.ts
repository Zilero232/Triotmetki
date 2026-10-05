import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';

import { AppConfigService } from '../../config';
import { QUEUE_CONNECTION } from './queues.constants';

@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => new Redis(config.get('REDIS_URL'), { maxRetriesPerRequest: null })
    }
  ],
  exports: [QUEUE_CONNECTION]
})
export class QueueConnectionModule {}
