import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { UsageActorGuard } from './guards/usage-actor.guard';
import { UsageMeterService } from './services/usage-meter.service';
import { UsageController } from './usage.controller';

@Module({
  imports: [BillingCoreModule],
  controllers: [UsageController],
  providers: [UsageMeterService, UsageActorGuard],
  exports: [UsageMeterService, UsageActorGuard]
})
export class UsageModule {}
