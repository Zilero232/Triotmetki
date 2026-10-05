import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../../notifications';
import { ReferenceCoreModule } from '../../reference';
import { StreamerChatModule } from '../chat';
import { StreamerIntegrationsModule } from '../integrations';
import { StreamerOverlayPublisherModule } from '../overlays';
import { ChallengeFeedService } from './services/challenge-feed.service';
import { DonationListenerService } from './services/donation-listener.service';
import { StreamerChallengesModule } from './streamer-challenges.module';

@Module({
  imports: [
    NotificationsProducerModule,
    ReferenceCoreModule,
    StreamerChallengesModule,
    StreamerChatModule,
    StreamerIntegrationsModule,
    StreamerOverlayPublisherModule
  ],
  providers: [ChallengeFeedService, DonationListenerService],
  exports: [ChallengeFeedService]
})
export class StreamerChallengesWorkerModule {}
