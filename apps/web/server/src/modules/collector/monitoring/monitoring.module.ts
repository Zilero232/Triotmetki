import { Module } from '@nestjs/common';

import { QueueStatsService } from './queue-stats.service';

@Module({
  providers: [QueueStatsService]
})
export class MonitoringModule {}
