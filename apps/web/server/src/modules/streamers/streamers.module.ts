import { Module } from '@nestjs/common';

import { ModModule } from '../mod';
import { AdminStreamersController } from './admin-streamers.controller';
import { StreamerChallengesController, StreamerChallengesModule } from './challenges';
import { StreamerIntegrationsController, StreamerIntegrationsModule } from './integrations';
import { OverlaysController, StreamerOverlaysController, StreamerOverlaysModule } from './overlays';
import { StreamerPanelModule, TwitchPanelController } from './panel';
import { StreamerClaimsController, StreamerFollowsController, StreamerProfilesController, StreamerProfilesModule } from './profiles';
import { ModSettingsController, StreamerSettingsController, StreamerSettingsModule, StreamerSettingsShareController } from './settings';

@Module({
  imports: [
    ModModule,
    StreamerProfilesModule,
    StreamerSettingsModule,
    StreamerOverlaysModule,
    StreamerIntegrationsModule,
    StreamerChallengesModule,
    StreamerPanelModule
  ],
  controllers: [
    OverlaysController,
    TwitchPanelController,
    StreamerIntegrationsController,
    StreamerOverlaysController,
    StreamerChallengesController,
    StreamerSettingsController,
    StreamerSettingsShareController,
    StreamerFollowsController,
    StreamerProfilesController,
    StreamerClaimsController,
    AdminStreamersController,
    ModSettingsController
  ]
})
export class StreamersModule {}
