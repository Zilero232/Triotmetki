import { Module } from '@nestjs/common';

import { HttpModule } from '../../../core';
import { NotificationsProducerModule } from '../../notifications';
import { StreamerIntegrationsModule } from '../integrations';
import { FeedReaderService } from './services/feed-reader.service';
import { LivePlatformsService } from './services/live-platforms.service';
import { LiveStatusService } from './services/live-status.service';

@Module({
  imports: [HttpModule, NotificationsProducerModule, StreamerIntegrationsModule],
  providers: [LivePlatformsService, FeedReaderService, LiveStatusService],
  exports: [LivePlatformsService, LiveStatusService]
})
export class StreamerLiveModule {}
