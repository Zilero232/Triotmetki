import { Module } from '@nestjs/common';

import { OverlayPublisherService } from './services/overlay-publisher.service';

@Module({
  providers: [OverlayPublisherService],
  exports: [OverlayPublisherService]
})
export class StreamerOverlayPublisherModule {}
