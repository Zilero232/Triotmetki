import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../notifications';
import { BonusCodeWriterService } from './services/bonus-code-writer.service';
import { NewsReaderService } from './services/news-reader.service';
import { OfferReaderService } from './services/offer-reader.service';
import { ShopController } from './shop.controller';

@Module({
  imports: [NotificationsProducerModule],
  controllers: [ShopController],
  providers: [OfferReaderService, BonusCodeWriterService, NewsReaderService]
})
export class ShopModule {}
