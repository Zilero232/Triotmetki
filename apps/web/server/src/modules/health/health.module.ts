import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { CollectorStateIndicator } from './indicators/collector-state.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
import { CollectorStatusReaderService } from './services/collector-status-reader.service';
import { HealthReaderService } from './services/health-reader.service';

@Module({
  imports: [TerminusModule.forRoot({ errorLogStyle: 'json' })],
  controllers: [HealthController],
  providers: [HealthReaderService, CollectorStatusReaderService, RedisIndicator, CollectorStateIndicator]
})
export class HealthModule {}
