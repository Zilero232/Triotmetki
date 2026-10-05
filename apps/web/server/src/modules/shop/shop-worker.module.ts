import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ScrapeModule } from '../../core';
import { BillingCoreModule } from '../billing';
import { NotificationsProducerModule } from '../notifications';
import { SHOP_QUEUE } from './config/queue.constants';
import { ShopSchedulesService } from './processors/shop-schedules.service';
import { ShopProcessor } from './processors/shop.processor';
import { BonusCodeSyncService } from './services/bonus-code-sync.service';
import { BonusCodeWriterService } from './services/bonus-code-writer.service';
import { NewsEnrichAggregateService } from './services/news-enrich-aggregate.service';
import { OfferSyncService } from './services/offer-sync.service';

@Module({
  imports: [BillingCoreModule, NotificationsProducerModule, ScrapeModule, BullModule.registerQueue({ name: SHOP_QUEUE.name })],
  providers: [BonusCodeWriterService, OfferSyncService, BonusCodeSyncService, NewsEnrichAggregateService, ShopProcessor, ShopSchedulesService]
})
export class ShopWorkerModule {}
