import { Module } from '@nestjs/common';

import { UserLestaAccountsModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { NotificationsProducerModule } from '../notifications';
import { snapshotEventsQueriesProvider } from './providers/snapshot-events-queries.provider';
import { wrappedQueriesProvider } from './providers/wrapped-queries.provider';
import { FeedReaderService } from './services/feed-reader.service';
import { FollowReaderService } from './services/follow-reader.service';
import { FollowWriterService } from './services/follow-writer.service';
import { LeagueReaderService } from './services/league-reader.service';
import { LeagueStatsReaderService } from './services/league-stats-reader.service';
import { SignatureReaderService } from './services/signature-reader.service';
import { SnapshotEventsReaderService } from './services/snapshot-events-reader.service';
import { WeeklyChallengeReaderService } from './services/weekly-challenge-reader.service';
import { WrappedReaderService } from './services/wrapped-reader.service';
import { SocialController } from './social.controller';

@Module({
  imports: [UserLestaAccountsModule, BillingCoreModule, NotificationsProducerModule],
  controllers: [SocialController],
  providers: [
    snapshotEventsQueriesProvider,
    wrappedQueriesProvider,
    SnapshotEventsReaderService,
    FollowReaderService,
    FollowWriterService,
    FeedReaderService,
    LeagueStatsReaderService,
    LeagueReaderService,
    WeeklyChallengeReaderService,
    SignatureReaderService,
    WrappedReaderService
  ]
})
export class SocialModule {}
