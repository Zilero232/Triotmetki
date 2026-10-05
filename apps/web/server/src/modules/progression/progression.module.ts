import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts';
import { BillingCoreModule } from '../billing';
import { CosmeticsController } from './cosmetics.controller';
import { ProgressionCoreModule } from './progression-core.module';
import { ProgressionController } from './progression.controller';
import { CosmeticsWriterService } from './services/cosmetics-writer.service';
import { SeasonReaderService } from './services/season-reader.service';
import { TankProgressReaderService } from './services/tank-progress-reader.service';

@Module({
  imports: [AccountsModule, BillingCoreModule, ProgressionCoreModule],
  controllers: [ProgressionController, CosmeticsController],
  providers: [CosmeticsWriterService, SeasonReaderService, TankProgressReaderService]
})
export class ProgressionModule {}
