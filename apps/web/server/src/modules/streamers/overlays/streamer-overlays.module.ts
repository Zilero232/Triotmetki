import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../../billing';
import { ProgressionCoreModule } from '../../progression';
import { OverlayDataReaderService } from './services/overlay-data-reader.service';
import { OverlayStatsReaderService } from './services/overlay-stats-reader.service';
import { OverlayStreamService } from './services/overlay-stream.service';
import { OverlayWriterService } from './services/overlay-writer.service';
import { StreamerOverlayPublisherModule } from './streamer-overlay-publisher.module';

@Module({
  imports: [BillingCoreModule, ProgressionCoreModule, StreamerOverlayPublisherModule],
  providers: [OverlayWriterService, OverlayDataReaderService, OverlayStatsReaderService, OverlayStreamService],
  exports: [OverlayWriterService, OverlayDataReaderService, OverlayStreamService]
})
export class StreamerOverlaysModule {}
