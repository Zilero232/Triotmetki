import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { NotificationsProducerModule } from '../notifications';
import { WATCHLIST_QUEUE } from './config/queue.constants';
import { WatchlistSchedulesService } from './processors/watchlist-schedules.service';
import { WatchlistProcessor } from './processors/watchlist.processor';
import { watchlistQueriesProvider } from './providers/watchlist-queries.provider';
import { WatchlistActivityReaderService } from './services/watchlist-activity-reader.service';
import { WatchlistDigestService } from './services/watchlist-digest.service';

@Module({
  imports: [BillingCoreModule, NotificationsProducerModule, BullModule.registerQueue({ name: WATCHLIST_QUEUE.name })],
  providers: [watchlistQueriesProvider, WatchlistActivityReaderService, WatchlistDigestService, WatchlistProcessor, WatchlistSchedulesService]
})
export class WatchlistWorkerModule {}
