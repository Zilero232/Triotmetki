import { Module } from '@nestjs/common';

import { HttpModule } from '../../../core';
import { NotificationsProducerModule } from '../../notifications';
import { StreamerIntegrationsModule } from '../integrations';
import { LivePlatformsService } from './services/live-platforms.service';
import { LiveStatusSyncService } from './services/live-status-sync.service';

@Module({
  imports: [HttpModule, NotificationsProducerModule, StreamerIntegrationsModule],
  providers: [LivePlatformsService, LiveStatusSyncService],
  exports: [LivePlatformsService, LiveStatusSyncService]
})
export class StreamerLiveModule {}
