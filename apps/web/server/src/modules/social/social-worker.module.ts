import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../notifications';
import { SOCIAL_QUEUE } from './config/queue.constants';
import { SocialSchedulesService } from './processors/social-schedules.service';
import { SocialProcessor } from './processors/social.processor';
import { snapshotEventsQueriesProvider } from './providers/snapshot-events-queries.provider';
import { weeklyChallengeQueriesProvider } from './providers/weekly-challenge-queries.provider';
import { LeagueDivisionAggregateService } from './services/league-division-aggregate.service';
import { LeagueStatsReaderService } from './services/league-stats-reader.service';
import { SnapshotEventsReaderService } from './services/snapshot-events-reader.service';
import { WeeklyChallengeAggregateService } from './services/weekly-challenge-aggregate.service';

@Module({
  imports: [NotificationsProducerModule, BullModule.registerQueue({ name: SOCIAL_QUEUE.name })],
  providers: [
    snapshotEventsQueriesProvider,
    weeklyChallengeQueriesProvider,
    SnapshotEventsReaderService,
    LeagueStatsReaderService,
    LeagueDivisionAggregateService,
    WeeklyChallengeAggregateService,
    SocialProcessor,
    SocialSchedulesService
  ]
})
export class SocialWorkerModule {}
