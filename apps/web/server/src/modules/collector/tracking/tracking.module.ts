import { Module } from '@nestjs/common';

import { ReferenceCoreModule } from '../../reference';
import { PurgeModule } from '../purge';
import { EnrolProcessor } from './processors/enrol.processor';
import { PollProcessor } from './processors/poll.processor';
import { SweepProcessor } from './processors/sweep.processor';
import { accountWriteQueriesProvider } from './providers/account-write-queries.provider';
import { playerQueriesProvider } from './providers/player-queries.provider';
import { AccountWriterService } from './services/account-writer.service';
import { DispatchService } from './services/dispatch.service';
import { EnrolService } from './services/enrol.service';
import { PlayerWriterService } from './services/player-writer.service';
import { PollSyncService } from './services/poll-sync.service';
import { RatingsTriggerService } from './services/ratings-trigger.service';
import { SeedService } from './services/seed.service';
import { TrackingAnnounceService } from './services/tracking-announce.service';
import { TrackingLestaService } from './services/tracking-lesta.service';

@Module({
  imports: [PurgeModule, ReferenceCoreModule],
  providers: [
    playerQueriesProvider,
    accountWriteQueriesProvider,
    TrackingLestaService,
    TrackingAnnounceService,
    PlayerWriterService,
    AccountWriterService,
    RatingsTriggerService,
    PollSyncService,
    DispatchService,
    SeedService,
    EnrolService,
    EnrolProcessor,
    PollProcessor,
    SweepProcessor
  ]
})
export class TrackingModule {}
