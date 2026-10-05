import { Module } from '@nestjs/common';

import { AnalyticsCoreModule } from '../analytics';
import { BillingCoreModule } from '../billing';
import { SupertestReaderService } from './services/supertest-reader.service';
import { SupertestController } from './supertest.controller';

@Module({
  imports: [AnalyticsCoreModule, BillingCoreModule],
  controllers: [SupertestController],
  providers: [SupertestReaderService]
})
export class SupertestModule {}
