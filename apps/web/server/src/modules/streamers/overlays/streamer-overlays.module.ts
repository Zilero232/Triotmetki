import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../../billing';
import { ProgressionCoreModule } from '../../progression';
import { OverlayDataService } from './services/overlay-data.service';
import { OverlayStatsReaderService } from './services/overlay-stats-reader.service';
import { OverlayStreamService } from './services/overlay-stream.service';
import { OverlayService } from './services/overlay.service';
import { StreamerOverlayPublisherModule } from './streamer-overlay-publisher.module';

@Module({
  imports: [BillingCoreModule, ProgressionCoreModule, StreamerOverlayPublisherModule],
  providers: [OverlayService, OverlayDataService, OverlayStatsReaderService, OverlayStreamService],
  exports: [OverlayService, OverlayDataService, OverlayStreamService]
})
export class StreamerOverlaysModule {}
