import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../notifications';
import { COMPETITION_QUEUE } from './config/competitions.constants';
import { CompetitionsSchedulesService } from './processors/competitions-schedules.service';
import { CompetitionsProcessor } from './processors/competitions.processor';
import { competitionBattlesQueriesProvider } from './providers/competition-battles-queries.provider';
import { CompetitionScoringAggregateService } from './services/competition-scoring-aggregate.service';

@Module({
  imports: [NotificationsProducerModule, BullModule.registerQueue({ name: COMPETITION_QUEUE.name })],
  providers: [competitionBattlesQueriesProvider, CompetitionScoringAggregateService, CompetitionsProcessor, CompetitionsSchedulesService]
})
export class CompetitionsWorkerModule {}
