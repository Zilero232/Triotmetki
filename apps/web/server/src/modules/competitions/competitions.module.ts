import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { CompetitionsController } from './competitions.controller';
import { CompetitionReaderService } from './services/competition-reader.service';
import { CompetitionWriterService } from './services/competition-writer.service';

@Module({
  imports: [BillingCoreModule],
  controllers: [CompetitionsController],
  providers: [CompetitionReaderService, CompetitionWriterService]
})
export class CompetitionsModule {}
