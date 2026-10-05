import { Global, Module } from '@nestjs/common';

import { collectorQueues } from './providers/collector-queues.provider';
import { QueueRegistryService } from './queue-registry.service';

@Global()
@Module({
  imports: [collectorQueues],
  providers: [QueueRegistryService],
  exports: [collectorQueues, QueueRegistryService]
})
export class CollectorQueuesModule {}
