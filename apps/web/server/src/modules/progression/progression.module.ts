import { Module } from '@nestjs/common';

import { UserLestaAccountsModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { CosmeticsController } from './cosmetics.controller';
import { ProgressionCoreModule } from './progression-core.module';
import { ProgressionController } from './progression.controller';
import { SeasonReaderService } from './services/season-reader.service';
import { TankProgressReaderService } from './services/tank-progress-reader.service';

@Module({
  imports: [UserLestaAccountsModule, BillingCoreModule, ProgressionCoreModule],
  controllers: [ProgressionController, CosmeticsController],
  providers: [SeasonReaderService, TankProgressReaderService]
})
export class ProgressionModule {}
