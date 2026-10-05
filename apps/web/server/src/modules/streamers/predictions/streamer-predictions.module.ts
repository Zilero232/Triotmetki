import { Module } from '@nestjs/common';

import { ReferenceCoreModule } from '../../reference';
import { StreamerChatModule } from '../chat';
import { StreamerIntegrationsModule } from '../integrations';
import { TwitchPredictionsService } from './services/twitch-predictions.service';

@Module({
  imports: [ReferenceCoreModule, StreamerChatModule, StreamerIntegrationsModule],
  providers: [TwitchPredictionsService],
  exports: [TwitchPredictionsService]
})
export class StreamerPredictionsModule {}
